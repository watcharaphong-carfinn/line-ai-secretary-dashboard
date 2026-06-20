import { getSessionUser, firestore } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface AuditRow { ts: string; action: string; actor: string; detail: string; }

export async function GET() {
  const u = await getSessionUser();
  if (!u || u.role !== "super_admin") return Response.json({ error: "forbidden" }, { status: 403 });

  try {
    const fs = await firestore();
    const res = await fetch(`${fs.base}/audit?pageSize=300`, { headers: fs.headers, signal: AbortSignal.timeout(10000) });
    if (res.status === 404) return Response.json({ logs: [] });
    if (!res.ok) throw new Error(`firestore ${res.status}`);
    const data = await res.json();
    const logs: AuditRow[] = (data.documents || []).map((d: { fields?: Record<string, { stringValue?: string }> }) => ({
      ts: d.fields?.ts?.stringValue || "",
      action: d.fields?.action?.stringValue || "",
      actor: d.fields?.actor?.stringValue || "",
      detail: d.fields?.detail?.stringValue || "",
    }));
    logs.sort((a, b) => b.ts.localeCompare(a.ts)); // ใหม่ → เก่า
    return Response.json({ logs });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
