// RBAC — ส่วนบริสุทธิ์ (ไม่มี server-only import) ใช้ได้ทั้ง client + server
export const SECTIONS = ["central", "marketing", "sales", "ads", "admin"] as const;
export type Section = typeof SECTIONS[number];

export const SECTION_LABELS: Record<Section, string> = {
  central: "งานส่วนกลาง (ยอดปิด)",
  marketing: "การตลาด · Lead",
  sales: "งานเซล · ส่งงาน",
  ads: "โฆษณา",
  admin: "ผู้ดูแลระบบ",
};

export interface Perm { v: boolean; e: boolean; d: boolean }  // ดู / แก้ไข / ลบ
export type Perms = Record<Section, Perm>;

const mkPerms = (val: boolean): Perms =>
  Object.fromEntries(SECTIONS.map(s => [s, { v: val, e: val, d: val }])) as Perms;
export const ALL_PERMS = (): Perms => mkPerms(true);
export const NO_PERMS = (): Perms => mkPerms(false);

// รับ input จากฟอร์ม/Firestore → Perms สมบูรณ์ (แก้ไข/ลบ ต้องมี view เสมอ)
export function normalizePerms(p: Partial<Record<Section, Partial<Perm>>> | undefined | null): Perms {
  const out = NO_PERMS();
  if (p) for (const s of SECTIONS) if (p[s]) out[s] = { v: !!p[s]!.v, e: !!p[s]!.e, d: !!p[s]!.d };
  for (const s of SECTIONS) if (out[s].e || out[s].d) out[s].v = true;
  return out;
}

// route → หัวข้อ
export function routeSection(pathname: string): Section {
  if (pathname.startsWith("/marketing")) return "marketing";
  if (pathname.startsWith("/sales")) return "sales";
  if (pathname.startsWith("/ads")) return "ads";
  if (["/bot", "/users", "/audit", "/settings", "/system"].some(p => pathname === p || pathname.startsWith(p + "/"))) return "admin";
  return "central"; // /, /customers, /followup, /analytics
}

export type AccessLike = { role: string; perms?: Perms | null };
export const canView   = (u: AccessLike | null, s: Section) => !!u && (u.role === "super_admin" || !!u.perms?.[s]?.v);
export const canEdit   = (u: AccessLike | null, s: Section) => !!u && (u.role === "super_admin" || !!u.perms?.[s]?.e);
export const canDelete = (u: AccessLike | null, s: Section) => !!u && (u.role === "super_admin" || !!u.perms?.[s]?.d);
export const firstViewable = (u: AccessLike | null): Section | null =>
  !u ? null : u.role === "super_admin" ? "central" : (SECTIONS.find(s => u.perms?.[s]?.v) ?? null);
