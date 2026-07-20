import { getSessionUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  // ต้อง login — สถิติยอดขาย ไม่เปิดสาธารณะ
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const url = process.env.LINE_SECRETARY_URL;
  const key = process.env.DASHBOARD_API_KEY;

  if (!url || !key) {
    return Response.json({ error: 'not configured' }, { status: 503 });
  }

  try {
    const res = await fetch(`${url}/api/stats`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    return Response.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
