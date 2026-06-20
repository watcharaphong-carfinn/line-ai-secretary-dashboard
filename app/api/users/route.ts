import { getSessionUser, firestore, logAudit } from "@/lib/auth";

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

// ── เพิ่ม user (เฉพาะ super_admin) ───────────────────────────────────────────────
async function requireSuperAdmin() {
  const u = await getSessionUser();
  return u && u.role === 'super_admin' ? u : null;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return Response.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const role = String(body.role || 'viewer');
  if (!EMAIL_RE.test(email)) return Response.json({ error: 'อีเมลไม่ถูกต้อง' }, { status: 400 });
  if (!['admin', 'viewer'].includes(role)) return Response.json({ error: 'role ไม่ถูกต้อง' }, { status: 400 });
  if (email === SUPER_ADMIN) return Response.json({ error: 'เป็น Super Admin อยู่แล้ว' }, { status: 400 });

  try {
    const fs = await firestore();
    const r = await fetch(`${fs.base}/users/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: fs.headers,
      body: JSON.stringify({ fields: {
        email: { stringValue: email },
        role: { stringValue: role },
        addedBy: { stringValue: admin.email },
        addedAt: { stringValue: new Date().toISOString() },
      } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`firestore ${r.status}`);
    await logAudit("user_add", admin.email, `${email} (${role})`);
    return Response.json({ ok: true, email, role });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// ── ลบ user (เฉพาะ super_admin) ──────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return Response.json({ error: 'forbidden' }, { status: 403 });

  const email = (new URL(req.url).searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return Response.json({ error: 'missing email' }, { status: 400 });
  if (email === SUPER_ADMIN) return Response.json({ error: 'ลบ Super Admin ไม่ได้' }, { status: 400 });

  try {
    const fs = await firestore();
    const r = await fetch(`${fs.base}/users/${encodeURIComponent(email)}`, {
      method: 'DELETE', headers: fs.headers, signal: AbortSignal.timeout(10000),
    });
    if (!r.ok && r.status !== 404) throw new Error(`firestore ${r.status}`);
    await logAudit("user_remove", admin.email, email);
    return Response.json({ ok: true, email });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
