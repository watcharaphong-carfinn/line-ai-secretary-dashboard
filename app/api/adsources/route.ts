import { getSessionUser, firestore, logAudit } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// ทะเบียนบัญชีโฆษณา (LINE OA / TikTok / …) เก็บใน Firestore collection 'adsources'
//   doc id = "<platform>_<accountId>"
//   fields: platform, accountId, name, group, enabled, token(ลับ), addedBy, addedAt, lastSyncAt, lastError
//
//   ⚠️ token ไม่ถูกส่งกลับเบราว์เซอร์เด็ดขาด — GET คืนแค่ hasToken (true/false)
//   อ่าน/เขียนผ่าน SA ของ Cloud Run เท่านั้น (Firestore ไม่ได้เปิดสาธารณะ)

const PLATFORMS = ['line', 'tiktok', 'meta', 'google'] as const;
type Platform = typeof PLATFORMS[number];

interface AdSource {
  id: string; platform: string; accountId: string; name: string;
  group?: string; enabled: boolean; hasToken: boolean; hasChannelSecret: boolean;
  addedBy?: string; addedAt?: string; lastSyncAt?: string; lastError?: string;
}

const docId = (platform: string, accountId: string) =>
  `${platform}_${accountId}`.replace(/[^\w.-]/g, '_');

async function requireSuperAdmin() {
  const u = await getSessionUser();
  return u && u.role === 'super_admin' ? u : null;
}

export async function GET() {
  // ดูรายการ: ต้อง login (ทุก role) — แต่ไม่เห็น token
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const fs = await firestore();
    const r = await fetch(`${fs.base}/adsources?pageSize=300`, {
      headers: fs.headers, signal: AbortSignal.timeout(10000),
    });
    if (r.status === 404) return Response.json({ sources: [] });
    if (!r.ok) throw new Error(`firestore ${r.status}`);
    const data = await r.json();
    type F = Record<string, { stringValue?: string; booleanValue?: boolean }>;
    const sources: AdSource[] = (data.documents || []).map((d: { name: string; fields?: F }) => {
      const f = d.fields || {};
      return {
        id: d.name.split('/').pop() || '',
        platform: f.platform?.stringValue || '',
        accountId: f.accountId?.stringValue || '',
        name: f.name?.stringValue || '',
        group: f.group?.stringValue || '',
        enabled: f.enabled?.booleanValue !== false,
        hasToken: !!f.token?.stringValue,          // ← บอกแค่ว่ามี/ไม่มี
        hasChannelSecret: !!f.channelSecret?.stringValue,
        addedBy: f.addedBy?.stringValue,
        addedAt: f.addedAt?.stringValue,
        lastSyncAt: f.lastSyncAt?.stringValue,
        lastError: f.lastError?.stringValue,
      };
    });
    sources.sort((a, b) => a.platform.localeCompare(b.platform) || a.name.localeCompare(b.name));
    return Response.json({ sources });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return Response.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const platform = String(body.platform || '').trim().toLowerCase() as Platform;
  const accountId = String(body.accountId || '').trim();
  const name = String(body.name || '').trim();
  const group = String(body.group || '').trim();
  const token = String(body.token || '').trim();
  const channelSecret = String(body.channelSecret || '').trim();
  const enabled = body.enabled !== false;

  if (!PLATFORMS.includes(platform)) return Response.json({ error: 'แพลตฟอร์มไม่ถูกต้อง' }, { status: 400 });
  if (!accountId) return Response.json({ error: 'ต้องระบุ Account ID' }, { status: 400 });
  if (!name) return Response.json({ error: 'ต้องตั้งชื่อบัญชี' }, { status: 400 });

  try {
    const fs = await firestore();
    const id = docId(platform, accountId);
    // เขียนเฉพาะ field ที่ส่งมา (ไม่ส่ง token = ไม่ทับของเดิม)
    const fields: Record<string, { stringValue?: string; booleanValue?: boolean }> = {
      platform: { stringValue: platform },
      accountId: { stringValue: accountId },
      name: { stringValue: name },
      group: { stringValue: group },
      enabled: { booleanValue: enabled },
      addedBy: { stringValue: admin.email },
      addedAt: { stringValue: new Date().toISOString() },
    };
    const paths = Object.keys(fields);
    if (token) { fields.token = { stringValue: token }; paths.push('token'); }
    if (channelSecret) { fields.channelSecret = { stringValue: channelSecret }; paths.push('channelSecret'); }
    const mask = paths.map(p => `updateMask.fieldPaths=${p}`).join('&');

    const r = await fetch(`${fs.base}/adsources/${encodeURIComponent(id)}?${mask}`, {
      method: 'PATCH', headers: fs.headers,
      body: JSON.stringify({ fields }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`firestore ${r.status}`);
    await logAudit('adsource_save', admin.email, `${platform}:${name} (${accountId})${token ? ' +token' : ''}`);
    return Response.json({ ok: true, id });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return Response.json({ error: 'forbidden' }, { status: 403 });

  const id = (new URL(req.url).searchParams.get('id') || '').trim();
  if (!id) return Response.json({ error: 'missing id' }, { status: 400 });

  try {
    const fs = await firestore();
    const r = await fetch(`${fs.base}/adsources/${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: fs.headers, signal: AbortSignal.timeout(10000),
    });
    if (!r.ok && r.status !== 404) throw new Error(`firestore ${r.status}`);
    await logAudit('adsource_remove', admin.email, id);
    return Response.json({ ok: true, id });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
