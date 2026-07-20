import { getSessionUser, logAudit } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// สั่งบอท sync ข้อมูล — proxy ไปที่ /admin/sync ของบอท (ใช้ DASHBOARD_API_KEY ฝั่ง server)
//   บอทตอบกลับทันทีแล้วรัน background (sync ใช้เวลา 40s+)
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== 'super_admin') return Response.json({ error: 'forbidden' }, { status: 403 });

  const url = process.env.LINE_SECRETARY_URL;
  const key = process.env.DASHBOARD_API_KEY;
  if (!url || !key) return Response.json({ error: 'not configured' }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const force = body.force === true;

  try {
    const r = await fetch(`${url}/admin/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
      signal: AbortSignal.timeout(15000),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `bot ${r.status}`);
    await logAudit('bot_sync', user.email, force ? 'force sync' : 'sync');
    return Response.json({ ok: true, mode: d.mode || (force ? 'force' : 'manual') });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
