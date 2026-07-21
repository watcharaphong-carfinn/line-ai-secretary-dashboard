import { gate } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// อ่านสถิติ "เวลาที่ทักครั้งแรก" ที่บอทเก็บไว้ (collection inbound_stats)
//   doc id = sourceId · fields byHour/byDate (JSON), total, updatedAt
//   บอทเขียนผ่าน /webhook/inbound/:sourceId — ที่นี่แค่อ่านมาแสดง

const META = 'http://metadata.google.internal/computeMetadata/v1';
const MH = { 'Metadata-Flavor': 'Google' };

async function token(): Promise<string> {
  const r = await fetch(`${META}/instance/service-accounts/default/token`, { headers: MH });
  if (!r.ok) throw new Error('metadata token failed');
  return (await r.json()).access_token as string;
}
async function projectId(): Promise<string> {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  const r = await fetch(`${META}/project/project-id`, { headers: MH });
  return (await r.text()).trim();
}

const parse = <T,>(v: string | undefined, fb: T): T => {
  if (!v) return fb;
  try { return JSON.parse(v) as T; } catch { return fb; }
};

interface StatDoc {
  id: string; total: number; updatedAt: string | null;
  byHour: Record<string, number>; byDate: Record<string, number>;
}

export async function GET() {
  const g = await gate("ads"); if ("error" in g) return g.error;
  try {
    const [t, p] = await Promise.all([token(), projectId()]);
    const base = `https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents`;
    const r = await fetch(`${base}/inbound_stats?pageSize=100`, {
      headers: { Authorization: `Bearer ${t}` }, signal: AbortSignal.timeout(10000),
    });
    if (r.status === 404) return Response.json({ stats: [] });
    if (!r.ok) throw new Error(`firestore ${r.status}`);
    const data = await r.json();
    type F = Record<string, { stringValue?: string; integerValue?: string }>;
    const stats: StatDoc[] = (data.documents || []).map((d: { name: string; fields?: F }) => {
      const f = d.fields || {};
      return {
        id: d.name.split('/').pop() || '',
        total: f.total?.integerValue ? Number(f.total.integerValue) : 0,
        updatedAt: f.updatedAt?.stringValue || null,
        byHour: parse(f.byHour?.stringValue, {} as Record<string, number>),
        byDate: parse(f.byDate?.stringValue, {} as Record<string, number>),
      };
    });
    return Response.json({ stats });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
