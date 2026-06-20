export const dynamic = 'force-dynamic';

// อ่าน aggregates ข้อมูลรายเคส (deal) จาก Firestore โดยตรง (ไม่ผ่านบอท)
//   doc: dealagg/agg  field data = JSON.stringify(aggregates) ที่ deal-sync เขียนไว้
//   ใช้ token จาก metadata server ของ Cloud Run → ไม่ต้องเพิ่ม dependency
//   ต้อง: service account ของ dashboard มี role roles/datastore.user

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

export async function GET() {
  try {
    const [token, project] = await Promise.all([metadataToken(), projectId()]);
    const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/dealagg/agg`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) {
      return Response.json({ agg: null, dealCount: 0, updatedAt: null, note: 'ยังไม่มีข้อมูลรายเคส (รอ deal-sync รอบแรก)' });
    }
    if (!res.ok) throw new Error(`firestore ${res.status}`);
    const doc = await res.json();
    const fields = doc?.fields || {};
    const json = fields.data?.stringValue;
    const agg = json ? JSON.parse(json) : null;
    const updatedAt = fields.updatedAt?.stringValue || null;
    const dealCount = fields.dealCount?.integerValue ? Number(fields.dealCount.integerValue) : (agg?.totalDeals || 0);
    return Response.json({ agg, dealCount, updatedAt });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
