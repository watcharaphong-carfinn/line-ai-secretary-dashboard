import { getSessionUser, firestore } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// ทดสอบการเชื่อมต่อของบัญชีโฆษณา — เอา token ที่เก็บไว้ไปยิง API จริงของแพลตฟอร์ม
//   LINE   : GET /v2/bot/info (เช็ค token) + /v2/bot/insight/followers (ดูว่าดึงสถิติได้ไหม)
//   TikTok : ยังไม่รองรับ (ต้องมี App ID/Secret + OAuth ก่อน)
// token ไม่ถูกส่งกลับเบราว์เซอร์ — ใช้เฉพาะฝั่งเซิร์ฟเวอร์

interface Fields { [k: string]: { stringValue?: string; booleanValue?: boolean } }

// วันที่ย้อนหลัง n วัน (เวลาไทย) รูปแบบ YYYYMMDD — LINE ยังไม่มีข้อมูลของ "วันนี้"
function dateYMD(daysAgo: number): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  now.setDate(now.getDate() - daysAgo);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`;
}

async function saveStatus(id: string, ok: boolean, errMsg: string) {
  try {
    const fs = await firestore();
    const fields: Fields = {
      lastSyncAt: { stringValue: new Date().toISOString() },
      lastError: { stringValue: ok ? '' : errMsg.slice(0, 200) },
    };
    const mask = 'updateMask.fieldPaths=lastSyncAt&updateMask.fieldPaths=lastError';
    await fetch(`${fs.base}/adsources/${encodeURIComponent(id)}?${mask}`, {
      method: 'PATCH', headers: fs.headers,
      body: JSON.stringify({ fields }), signal: AbortSignal.timeout(8000),
    });
  } catch { /* บันทึกสถานะไม่ได้ก็ไม่เป็นไร */ }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '').trim();
  if (!id) return Response.json({ error: 'missing id' }, { status: 400 });

  // ── ดึง source + token จาก Firestore ──
  let platform = '', name = '', token = '';
  try {
    const fs = await firestore();
    const r = await fetch(`${fs.base}/adsources/${encodeURIComponent(id)}`, {
      headers: fs.headers, signal: AbortSignal.timeout(10000),
    });
    if (r.status === 404) return Response.json({ error: 'ไม่พบบัญชีนี้ในทะเบียน' }, { status: 404 });
    if (!r.ok) throw new Error(`firestore ${r.status}`);
    const f: Fields = (await r.json()).fields || {};
    platform = f.platform?.stringValue || '';
    name = f.name?.stringValue || '';
    token = f.token?.stringValue || '';
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }

  if (!token) return Response.json({ ok: false, name, error: 'ยังไม่ได้ใส่ token สำหรับบัญชีนี้' });

  // ── LINE ──
  if (platform === 'line') {
    try {
      const auth = { Authorization: `Bearer ${token}` };
      const info = await fetch('https://api.line.me/v2/bot/info', { headers: auth, signal: AbortSignal.timeout(12000) });
      if (info.status === 401) {
        await saveStatus(id, false, 'token ใช้ไม่ได้ (401)');
        return Response.json({ ok: false, name, error: 'token ใช้ไม่ได้ / หมดอายุ (401) — ออก token ใหม่จาก LINE Developers Console' });
      }
      if (!info.ok) {
        const t = await info.text();
        await saveStatus(id, false, `LINE ${info.status}`);
        return Response.json({ ok: false, name, error: `LINE ตอบ ${info.status}: ${t.slice(0, 160)}` });
      }
      const bot = await info.json();

      // สถิติผู้ติดตาม — ใช้ข้อมูลเมื่อวาน (ของวันนี้ยังไม่พร้อม)
      let followers: Record<string, unknown> | null = null;
      let followersNote = '';
      try {
        const fr = await fetch(`https://api.line.me/v2/bot/insight/followers?date=${dateYMD(1)}`, {
          headers: auth, signal: AbortSignal.timeout(12000),
        });
        if (fr.ok) {
          const fd = await fr.json();
          followers = fd;
          if (fd.status === 'unready') followersNote = 'LINE ยังประมวลผลสถิติวันนั้นไม่เสร็จ (ลองใหม่พรุ่งนี้)';
          else if (fd.status === 'out_of_service') followersNote = 'OA นี้ยังมีผู้ติดตามน้อยเกินไป LINE จึงไม่ให้สถิติ';
        } else {
          followersNote = `ดึงสถิติไม่ได้ (${fr.status}) — token อาจไม่มีสิทธิ์ insight`;
        }
      } catch { followersNote = 'ดึงสถิติไม่สำเร็จ (timeout)'; }

      await saveStatus(id, true, '');
      return Response.json({
        ok: true, name, platform,
        bot: { displayName: bot.displayName, basicId: bot.basicId, chatMode: bot.chatMode, premiumId: bot.premiumId || null },
        followers, followersNote,
      });
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      await saveStatus(id, false, m);
      return Response.json({ ok: false, name, error: m });
    }
  }

  // ── TikTok (ยังไม่รองรับ) ──
  if (platform === 'tiktok') {
    return Response.json({
      ok: false, name, platform,
      error: 'TikTok ยังทดสอบไม่ได้ — ต้องสร้าง Developer App (App ID/Secret) แล้วทำ OAuth ก่อน',
    });
  }

  return Response.json({ ok: false, name, error: `ยังไม่รองรับแพลตฟอร์ม "${platform}"` });
}
