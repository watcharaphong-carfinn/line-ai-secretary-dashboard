import { gate, firestore, logAudit } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// ดึงสถิติย้อนหลังจากแพลตฟอร์มมาเก็บใน Firestore
//   LINE: GET /v2/bot/insight/followers?date=YYYYMMDD (ได้ทีละวัน)
//   เก็บที่ adstats/<sourceId> field daily = JSON { "YYYYMMDD": {followers,reach,blocks} }
//   รวมกับของเดิมเสมอ (ไม่ลบประวัติ) → เรียกซ้ำได้ปลอดภัย

interface Fields { [k: string]: { stringValue?: string; booleanValue?: boolean } }
interface DayStat { followers: number; reach: number; blocks: number }

function dateYMD(daysAgo: number): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  now.setDate(now.getDate() - daysAgo);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`;
}

// ยิงทีละชุด (กัน rate limit ของ LINE)
async function inBatches<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...await Promise.all(items.slice(i, i + size).map(fn)));
  }
  return out;
}

export async function POST(req: Request) {
  const g = await gate("ads", "e"); if ("error" in g) return g.error;
  const user = g.user;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '').trim();
  const days = Math.min(Math.max(parseInt(String(body.days || 30), 10) || 30, 1), 60);
  if (!id) return Response.json({ error: 'missing id' }, { status: 400 });

  let platform = '', name = '', token = '';
  const fs = await firestore();
  try {
    const r = await fetch(`${fs.base}/adsources/${encodeURIComponent(id)}`, {
      headers: fs.headers, signal: AbortSignal.timeout(10000),
    });
    if (r.status === 404) return Response.json({ error: 'ไม่พบบัญชีนี้' }, { status: 404 });
    if (!r.ok) throw new Error(`firestore ${r.status}`);
    const f: Fields = (await r.json()).fields || {};
    platform = f.platform?.stringValue || '';
    name = f.name?.stringValue || '';
    token = f.token?.stringValue || '';
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }

  if (platform !== 'line') return Response.json({ error: `ยังรองรับเฉพาะ LINE (บัญชีนี้เป็น ${platform})` }, { status: 400 });
  if (!token) return Response.json({ error: 'ยังไม่ได้ใส่ token' }, { status: 400 });

  // ── โหลดของเดิม ──
  let daily: Record<string, DayStat> = {};
  try {
    const r = await fetch(`${fs.base}/adstats/${encodeURIComponent(id)}`, {
      headers: fs.headers, signal: AbortSignal.timeout(10000),
    });
    if (r.ok) {
      const f: Fields = (await r.json()).fields || {};
      if (f.daily?.stringValue) daily = JSON.parse(f.daily.stringValue);
    }
  } catch { /* ไม่มีของเดิมก็เริ่มใหม่ */ }

  // ── ดึงทีละวัน (ข้ามวันนี้ เพราะ LINE ยังไม่ประมวลผล) ──
  const targets = Array.from({ length: days }, (_, i) => dateYMD(i + 1));
  const auth = { Authorization: `Bearer ${token}` };
  let added = 0, unready = 0, failed = 0;

  const results = await inBatches(targets, 5, async (d) => {
    try {
      const r = await fetch(`https://api.line.me/v2/bot/insight/followers?date=${d}`, {
        headers: auth, signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) return { d, err: `HTTP ${r.status}` };
      const j = await r.json();
      if (j.status !== 'ready') return { d, skip: j.status as string };
      return { d, stat: { followers: j.followers || 0, reach: j.targetedReaches || 0, blocks: j.blocks || 0 } };
    } catch { return { d, err: 'timeout' }; }
  });

  for (const r of results) {
    if ('stat' in r && r.stat) { daily[r.d] = r.stat; added++; }
    else if ('skip' in r) unready++;
    else failed++;
  }

  // ── เขียนกลับ ──
  try {
    const mask = ['daily', 'platform', 'name', 'updatedAt'].map(p => `updateMask.fieldPaths=${p}`).join('&');
    const r = await fetch(`${fs.base}/adstats/${encodeURIComponent(id)}?${mask}`, {
      method: 'PATCH', headers: fs.headers,
      body: JSON.stringify({ fields: {
        daily: { stringValue: JSON.stringify(daily) },
        platform: { stringValue: platform },
        name: { stringValue: name },
        updatedAt: { stringValue: new Date().toISOString() },
      } }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`firestore ${r.status}`);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }

  await logAudit('adsource_sync', user.email, `${name}: +${added} วัน (รวม ${Object.keys(daily).length})`);
  return Response.json({
    ok: true, name, added, unready, failed,
    totalDays: Object.keys(daily).length,
    note: unready ? `${unready} วันที่ LINE ยังไม่ประมวลผล/ข้อมูลไม่พอ` : undefined,
  });
}

// อ่านสถิติที่เก็บไว้ (ทุก source) — ใช้วาดกราฟ
export async function GET() {
  const g = await gate("ads"); if ("error" in g) return g.error;
  try {
    const fs = await firestore();
    const r = await fetch(`${fs.base}/adstats?pageSize=100`, { headers: fs.headers, signal: AbortSignal.timeout(10000) });
    if (r.status === 404) return Response.json({ stats: [] });
    if (!r.ok) throw new Error(`firestore ${r.status}`);
    const data = await r.json();
    const stats = (data.documents || []).map((d: { name: string; fields?: Fields }) => {
      const f = d.fields || {};
      let daily: Record<string, DayStat> = {};
      try { daily = f.daily?.stringValue ? JSON.parse(f.daily.stringValue) : {}; } catch { }
      return {
        id: d.name.split('/').pop() || '',
        name: f.name?.stringValue || '',
        platform: f.platform?.stringValue || '',
        updatedAt: f.updatedAt?.stringValue || null,
        daily,
      };
    });
    return Response.json({ stats });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
