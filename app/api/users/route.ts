export const dynamic = 'force-dynamic';

// จัดการรายชื่อผู้ใช้หลังบ้าน (allowlist + role) เก็บใน Firestore collection 'users'
//   doc id = email, fields: role (super_admin|admin|viewer), addedBy, addedAt
//   อ่าน/เขียนตรงผ่าน metadata token ของ Cloud Run (SA ต้องมี roles/datastore.user)
//   super admin เริ่มต้น = watcharaphong.s@carfinn.com (seed เสมอ)

const SUPER_ADMIN = 'watcharaphong.s@carfinn.com';
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
  if (!r.ok) throw new Error('metadata project-id failed');
  return (await r.text()).trim();
}
const docsBase = (p: string) => `https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents`;

interface UserRow { email: string; role: string; addedBy?: string; addedAt?: string; }

export async function GET() {
  try {
    const [t, p] = await Promise.all([token(), projectId()]);
    const res = await fetch(`${docsBase(p)}/users?pageSize=300`, {
      headers: { Authorization: `Bearer ${t}` },
      signal: AbortSignal.timeout(10000),
    });
    let users: UserRow[] = [];
    if (res.ok) {
      const data = await res.json();
      users = (data.documents || []).map((d: { name: string; fields?: Record<string, { stringValue?: string }> }) => {
        const f = d.fields || {};
        return {
          email: f.email?.stringValue || d.name.split('/').pop() || '',
          role: f.role?.stringValue || 'viewer',
          addedBy: f.addedBy?.stringValue,
          addedAt: f.addedAt?.stringValue,
        };
      });
    } else if (res.status !== 404) {
      throw new Error(`firestore ${res.status}`);
    }
    // seed super admin ถ้ายังไม่มีในลิสต์
    if (!users.some(u => u.email.toLowerCase() === SUPER_ADMIN)) {
      users.unshift({ email: SUPER_ADMIN, role: 'super_admin' });
    }
    // เรียง: super_admin > admin > viewer
    const rank: Record<string, number> = { super_admin: 0, admin: 1, viewer: 2 };
    users.sort((a, b) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9) || a.email.localeCompare(b.email));
    return Response.json({ users, superAdmin: SUPER_ADMIN });
  } catch (err: unknown) {
    // ถึง Firestore ไม่ได้ ก็ยังโชว์ super admin (กันหน้า 404/พัง)
    return Response.json({
      users: [{ email: SUPER_ADMIN, role: 'super_admin' }],
      superAdmin: SUPER_ADMIN,
      warn: err instanceof Error ? err.message : String(err),
    });
  }
}
