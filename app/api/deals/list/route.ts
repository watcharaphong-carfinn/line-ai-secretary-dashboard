import { getSessionUser, firestore } from "@/lib/auth";

export const dynamic = "force-dynamic";

// อ่าน per-deal รายเดือน (มี PII) จาก Firestore deals/<yearBE-month>
//   ต้อง login (ทุก role) — ข้อมูลลูกค้า ไม่เปิดสาธารณะ
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const month = (new URL(req.url).searchParams.get("month") || "").trim(); // เช่น "2569-6"
  if (!/^\d{4}-\d{1,2}$/.test(month)) return Response.json({ error: "bad month" }, { status: 400 });

  try {
    const fs = await firestore();
    const r = await fetch(`${fs.base}/deals/${month}`, { headers: fs.headers, signal: AbortSignal.timeout(10000) });
    if (r.status === 404) return Response.json({ deals: [], month });
    if (!r.ok) throw new Error(`firestore ${r.status}`);
    const doc = await r.json();
    const json = doc?.fields?.data?.stringValue;
    const deals = json ? JSON.parse(json) : [];
    return Response.json({ deals, month });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
