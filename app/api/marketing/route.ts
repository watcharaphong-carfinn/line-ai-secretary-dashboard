import { getSessionUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// อ่านข้อมูลแผนกการตลาด/Lead จาก Firestore โดยตรง (ไม่ผ่านบอท)
//   doc: marketing/summary → fields: agg | funnel | finance (JSON string, ไม่มี PII)
//   เขียนโดย syncLeads() ในบอท (line-ai-secretary)
//   ใช้ token จาก metadata server ของ Cloud Run — แพทเทิร์นเดียวกับ /api/deals

const META = 'http://metadata.google.internal/computeMetadata/v1';
const META_HEADERS = { 'Metadata-Flavor': 'Google' };

async function metadataToken(): Promise<string> {
  const res = await fetch(`${META}/instance/service-accounts/default/token`, { headers: META_HEADERS });
  if (!res.ok) throw new Error('metadata token failed');
  const j = await res.json();
  return j.access_token as string;
}

async function projectId(): Promise<string> {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  const res = await fetch(`${META}/project/project-id`, { headers: META_HEADERS });
  if (!res.ok) throw new Error('metadata project-id failed');
  return (await res.text()).trim();
}

const parse = <T,>(v: string | undefined, fallback: T): T => {
  if (!v) return fallback;
  try { return JSON.parse(v) as T; } catch { return fallback; }
};

export async function GET() {
  // ต้อง login — ข้อมูลงบโฆษณา/รายได้ ไม่เปิดสาธารณะ
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  try {
    const [token, project] = await Promise.all([metadataToken(), projectId()]);
    const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/marketing/summary`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) {
      return Response.json({
        funnel: [], agg: null, finance: null, leadCount: 0, updatedAt: null,
        note: 'ยังไม่มีข้อมูลการตลาด — สั่ง "force sync" ในไลน์เพื่อดึงรอบแรก',
      });
    }
    if (!res.ok) throw new Error(`firestore ${res.status}`);
    const doc = await res.json();
    const fields = doc?.fields || {};
    return Response.json({
      funnel: parse(fields.funnel?.stringValue, [] as unknown[]),
      agg: parse(fields.agg?.stringValue, null),
      finance: parse(fields.finance?.stringValue, null),
      leadCount: fields.leadCount?.integerValue ? Number(fields.leadCount.integerValue) : 0,
      updatedAt: fields.updatedAt?.stringValue || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
