import { gate, firestore } from "@/lib/auth";

export const dynamic = "force-dynamic";

// อ่าน per-lead รายเดือน (มี PII: ชื่อ/เบอร์) จาก Firestore leads/<yearBE-month>
//   สิทธิ์เดียวกับหน้างานเซล — gate("sales") · ข้อมูลลูกค้า ไม่เปิดสาธารณะ
//   month=2569-6 (เดือนเดียว) หรือ months=2569-6,2569-7 (หลายเดือน คั่นด้วย ,)
export async function GET(req: Request) {
  const g = await gate("sales"); if ("error" in g) return g.error;

  const sp = new URL(req.url).searchParams;
  const raw = (sp.get("months") || sp.get("month") || "").trim();
  const months = raw.split(",").map(s => s.trim()).filter(Boolean);
  if (!months.length || months.some(m => !/^\d{4}-\d{1,2}$/.test(m)))
    return Response.json({ error: "bad month" }, { status: 400 });

  try {
    const fs = await firestore();
    const results = await Promise.all(months.map(async (month) => {
      const r = await fetch(`${fs.base}/leads/${month}`, { headers: fs.headers, signal: AbortSignal.timeout(10000) });
      if (r.status === 404) return [];
      if (!r.ok) throw new Error(`firestore ${r.status}`);
      const doc = await r.json();
      const json = doc?.fields?.data?.stringValue;
      return json ? JSON.parse(json) : [];
    }));
    return Response.json({ leads: results.flat() });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
