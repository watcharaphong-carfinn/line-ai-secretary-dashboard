import crypto from "crypto";
import { cookies } from "next/headers";

// ── Session (signed HMAC token in httpOnly cookie) ──────────────────────────────
export const SESSION_COOKIE = "cf_session";
export const STATE_COOKIE = "cf_oauth_state";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 วัน

import { type Perms, type Section, ALL_PERMS, NO_PERMS, normalizePerms, canView, canEdit, canDelete } from "./sections";
export * from "./sections";

export interface SessionUser { email: string; name?: string; role: string; perms?: Perms; exp: number; }


const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

export function signSession(user: Omit<SessionUser, "exp">, secret: string): string {
  const payload: SessionUser = { ...user, exp: Date.now() + SESSION_TTL_MS };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined, secret: string): SessionUser | null {
  if (!token || !token.includes(".") || !secret) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionUser;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

// ── Allowlist / role (จาก Firestore users + super admin + โดเมน) ────────────────
export const SUPER_ADMIN = "watcharaphong.s@carfinn.com";
const META = "http://metadata.google.internal/computeMetadata/v1";
const MH = { "Metadata-Flavor": "Google" };

async function gcpToken(): Promise<string> {
  const r = await fetch(`${META}/instance/service-accounts/default/token`, { headers: MH });
  if (!r.ok) throw new Error("metadata token failed");
  return (await r.json()).access_token as string;
}
async function gcpProject(): Promise<string> {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  const r = await fetch(`${META}/project/project-id`, { headers: MH });
  return (await r.text()).trim();
}

// คืน { role, perms } ถ้าอนุญาตให้เข้า, คืน null ถ้าไม่อนุญาต
//   super admin = ทุกสิทธิ์ · มีใน Firestore = ตามที่ตั้ง · โดเมน carfinn.com (ยังไม่ถูกเพิ่ม) = login ได้แต่ยังไม่มีสิทธิ์
export async function resolveAccess(email: string): Promise<{ role: string; perms: Perms } | null> {
  const e = email.toLowerCase();
  if (e === SUPER_ADMIN) return { role: "super_admin", perms: ALL_PERMS() };

  try {
    const [t, p] = await Promise.all([gcpToken(), gcpProject()]);
    const url = `https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents/users/${encodeURIComponent(e)}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${t}` }, signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const doc = await r.json();
      const role = doc?.fields?.role?.stringValue || "member";
      let perms: Perms;
      try { perms = normalizePerms(doc?.fields?.perms?.stringValue ? JSON.parse(doc.fields.perms.stringValue) : undefined); }
      catch { perms = NO_PERMS(); }
      return { role, perms };
    }
  } catch { /* ตกไปเช็คโดเมน */ }

  const domain = (process.env.ALLOWED_DOMAIN || "").toLowerCase().trim();
  if (domain && e.endsWith(`@${domain}`)) return { role: "member", perms: NO_PERMS() };

  return null;
}

export const cfg = {
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  authSecret: process.env.AUTH_SECRET || "",
  dashboardUrl: process.env.DASHBOARD_URL || "",
  authEnabled: process.env.AUTH_ENABLED === "true",
  redirectPath: "/api/auth/callback",
};

// อ่าน session ปัจจุบันใน route handler/server component
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token, cfg.authSecret);
}

// ── ด่านตรวจสิทธิ์สำหรับ API (ความปลอดภัยจริง) ──────────────────────────────
//   ใช้: const g = await gate("central"); if ("error" in g) return g.error;
export async function gate(section: Section, action: "v" | "e" | "d" = "v"): Promise<{ user: SessionUser } | { error: Response }> {
  const u = await getSessionUser();
  if (!u) return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const ok = action === "e" ? canEdit(u, section) : action === "d" ? canDelete(u, section) : canView(u, section);
  if (!ok) return { error: Response.json({ error: "forbidden" }, { status: 403 }) };
  return { user: u };
}

// helper เขียน/ลบ Firestore (REST + metadata token) — ใช้ใน /api/users
export async function firestore() {
  const t = await gcpToken();
  const p = await gcpProject();
  return {
    base: `https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents`,
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
  };
}

// บันทึก audit log (append-only ลง Firestore collection 'audit') — best-effort ไม่ throw
export async function logAudit(action: string, actor: string, detail = "") {
  try {
    const fs = await firestore();
    await fetch(`${fs.base}/audit`, {
      method: "POST",
      headers: fs.headers,
      body: JSON.stringify({ fields: {
        ts: { stringValue: new Date().toISOString() },
        action: { stringValue: action },
        actor: { stringValue: actor || "-" },
        detail: { stringValue: detail || "" },
      } }),
      signal: AbortSignal.timeout(8000),
    });
  } catch { /* best-effort — อย่าให้ audit ล้มแล้วกระทบ action หลัก */ }
}
