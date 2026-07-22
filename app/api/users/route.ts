import { getSessionUser, gate, firestore, logAudit, normalizePerms, NO_PERMS, type Perms } from "@/lib/auth";
import { sendEmail, inviteEmailHtml, emailConfigured } from "@/lib/email";

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

interface UserRow { email: string; role: string; perms: Perms; addedBy?: string; addedAt?: string; }

export async function GET() {
  const g = await gate("admin"); if ("error" in g) return g.error;
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
        let perms: Perms;
        try { perms = normalizePerms(f.perms?.stringValue ? JSON.parse(f.perms.stringValue) : undefined); }
        catch { perms = NO_PERMS(); }
        return {
          email: f.email?.stringValue || d.name.split('/').pop() || '',
          role: f.role?.stringValue || 'member',
          perms,
          addedBy: f.addedBy?.stringValue,
          addedAt: f.addedAt?.stringValue,
        };
      });
    } else if (res.status !== 404) {
      throw new Error(`firestore ${res.status}`);
    }
    // seed super admin ถ้ายังไม่มีในลิสต์ (ทุกสิทธิ์)
    if (!users.some(u => u.email.toLowerCase() === SUPER_ADMIN)) {
      users.unshift({ email: SUPER_ADMIN, role: 'super_admin', perms: normalizePerms(undefined) });
    }
    // เรียง: super_admin ก่อน แล้วตามอีเมล
    users.sort((a, b) => (a.role === 'super_admin' ? 0 : 1) - (b.role === 'super_admin' ? 0 : 1) || a.email.localeCompare(b.email));
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
  if (!EMAIL_RE.test(email)) return Response.json({ error: 'อีเมลไม่ถูกต้อง' }, { status: 400 });
  // SSO: บังคับเฉพาะโดเมน carfinn.com
  const domain = (process.env.ALLOWED_DOMAIN || 'carfinn.com').toLowerCase().trim();
  if (!email.endsWith(`@${domain}`)) return Response.json({ error: `ต้องเป็นอีเมล @${domain} เท่านั้น` }, { status: 400 });
  if (email === SUPER_ADMIN) return Response.json({ error: 'เป็น Super Admin อยู่แล้ว' }, { status: 400 });

  const perms = normalizePerms(body.perms);

  try {
    const fs = await firestore();
    const r = await fetch(`${fs.base}/users/${encodeURIComponent(email)}?updateMask.fieldPaths=email&updateMask.fieldPaths=role&updateMask.fieldPaths=perms&updateMask.fieldPaths=addedBy&updateMask.fieldPaths=addedAt`, {
      method: 'PATCH',
      headers: fs.headers,
      body: JSON.stringify({ fields: {
        email: { stringValue: email },
        role: { stringValue: 'member' },
        perms: { stringValue: JSON.stringify(perms) },
        addedBy: { stringValue: admin.email },
        addedAt: { stringValue: new Date().toISOString() },
      } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`firestore ${r.status}`);
    const summary = Object.entries(perms).filter(([, p]) => p.v).map(([s]) => s).join(",") || "ไม่มีสิทธิ์";
    await logAudit("user_perms", admin.email, `${email} → ${summary}`);

    // ส่งอีเมลเชิญ (เฉพาะเพิ่มใหม่ + ตั้งค่า email แล้ว) — best-effort ไม่ให้พังทั้ง action
    let emailed: boolean | null = null; let emailError: string | undefined;
    if (body.sendInvite !== false && emailConfigured()) {
      const dash = process.env.DASHBOARD_URL || "";
      const res = await sendEmail(email, "คุณได้รับสิทธิ์เข้าใช้ CarFinn Dashboard", inviteEmailHtml(email, dash))
        .catch(e => ({ ok: false, error: String(e) }));
      emailed = res.ok; if (!res.ok) emailError = res.error;
      await logAudit(res.ok ? "invite_sent" : "invite_failed", admin.email, `${email}${res.ok ? "" : " · " + (res.error || "")}`);
    }
    return Response.json({ ok: true, email, perms, emailed, emailError });
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
