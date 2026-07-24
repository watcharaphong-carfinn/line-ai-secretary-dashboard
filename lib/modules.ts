// ── ทะเบียนโมดูลของ Internal Portal (internal.carfinn.com) ─────────────────────
// ส่วนบริสุทธิ์ ไม่มี server-only import → ใช้ได้ทั้ง client + server
// ปุ่ม waffle (AppLauncher) อ่านจากที่นี่ เพื่อสลับเข้าแต่ละโมดูลแบบ Google Workspace
//
// การย้ายโมดูลเข้ามา native ทำทีละตัว:
//   - ยังไม่ย้าย → ตั้ง href เป็น externalUrl (ลิงก์ออก subdomain เดิม, เปิดใช้ได้ทันที)
//   - ย้ายแล้ว   → ตั้ง internalPath (route ภายใน portal นี้) แล้ว helper จะเลือก path ในทันที

export type ModuleId = "dashboard" | "agent" | "prices" | "plus" | "settings";

export interface PortalModule {
  id: ModuleId;
  label: string;        // ชื่อโมดูล
  sublabel: string;     // คำอธิบายสั้น (ใต้ชื่อในไทล์)
  /** route ภายใน portal — ตั้งเมื่อย้ายโมดูลเข้ามา native แล้ว */
  internalPath?: string;
  /** ลิงก์ subdomain เดิม — ใช้ระหว่างยังไม่ย้าย (Phase 1) */
  externalUrl?: string;
  /** ชื่อ icon ของ lucide-react (map ใน AppLauncher) */
  icon: "dashboard" | "agent" | "prices" | "plus" | "settings";
  /** สีประจำโมดูล (พื้นไอคอนในไทล์) */
  color: string;
  /** โชว์เฉพาะผู้ดูแล (role super_admin หรือมีสิทธิ์หัวข้อ admin) */
  adminOnly?: boolean;
  /** ยังไม่พร้อมใช้ (แสดงจาง+ ป้าย "เร็วๆ นี้") */
  comingSoon?: boolean;
}

export const MODULES: PortalModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    sublabel: "Finance Operations",
    internalPath: "/", // โมดูลนี้คือแอปตัวแม่เอง
    icon: "dashboard",
    color: "#2563EB",
  },
  {
    id: "agent",
    label: "Agent",
    sublabel: "หลังบ้าน Admin",
    internalPath: "/agent",              // ฝังใน shell (URL อยู่ที่ internal.carfinn.com)
    externalUrl: "https://admin-agent.carfinn.com", // fallback (เปิดตรง)
    icon: "agent",
    color: "#10B981",
  },
  {
    id: "prices",
    label: "ราคารถ",
    sublabel: "ราคากลาง · มือสอง",
    internalPath: "/prices",
    externalUrl: "https://carprice.carfinn.com",
    icon: "prices",
    color: "#F59E0B",
  },
  {
    id: "settings",
    label: "ตั้งค่า",
    sublabel: "จัดการระบบ",
    internalPath: "/users",   // หน้าแรกของโมดูลนี้ = จัดการผู้ใช้งาน
    icon: "settings",
    color: "#64748B",
    adminOnly: true,
  },
  {
    id: "plus",
    label: "Carfin Plus",
    sublabel: "Investment (แยกภายหลัง)",
    externalUrl: "https://app.carfinnplus.net",
    icon: "plus",
    color: "#8B5CF6",
    comingSoon: true,
  },
];

/** ปลายทางที่ควรลิงก์ไป: internal ก่อน (ถ้าย้ายแล้ว) ไม่งั้น external */
export function moduleHref(m: PortalModule): string {
  return m.internalPath ?? m.externalUrl ?? "/";
}

/** โมดูลปัจจุบันจาก pathname (สำหรับไฮไลต์ไทล์ที่กำลังใช้) */
export function currentModuleId(pathname: string): ModuleId {
  if (pathname.startsWith("/agent")) return "agent";
  if (pathname.startsWith("/prices")) return "prices";
  if (pathname.startsWith("/users")) return "settings";
  return "dashboard";
}

// ── สิทธิ์รายโมดูล (จัดการรวมที่ portal → ส่งผ่าน SSO token ให้แต่ละโมดูล) ────────
// เก็บใน Firestore users/{email}.modules · ค่าว่าง/ไม่มี = ไม่ให้เข้าโมดูลนั้น
// dashboard ไม่อยู่ในนี้ — คุมด้วย perms รายหัวข้อ (ของเดิม)
export type ModuleAccess = Partial<Record<ModuleId, string>>;

/** ระดับสิทธิ์ที่เลือกได้ของแต่ละโมดูล (ใช้สร้าง dropdown ในหน้า /users) — ทุกโมดูลเลือกเหมือนกัน */
export const MODULE_ROLES: { id: ModuleId; label: string; roles: { value: string; label: string }[] }[] = [
  { id: "dashboard", label: "Dashboard", roles: [{ value: "use", label: "เข้าใช้งาน" }] },
  { id: "agent", label: "Agent · หลังบ้าน", roles: [{ value: "admin", label: "แอดมิน" }] },
  {
    id: "prices", label: "ราคารถ",
    roles: [
      { value: "user", label: "ดูอย่างเดียว" },
      { value: "finance_editor", label: "แก้เงื่อนไขไฟแนนซ์" },
      { value: "super_admin", label: "ผู้ดูแล" },
    ],
  },
];

/** เข้าโมดูลนี้ได้ไหม — ทุกโมดูลใช้กติกาเดียวกัน (super_admin เข้าได้ทุกโมดูล) */
export function hasModule(access: ModuleAccess | null | undefined, id: ModuleId, role?: string): boolean {
  if (role === "super_admin") return true;
  return !!access?.[id];
}

/** รับค่าจากฟอร์ม/Firestore → ModuleAccess ที่สะอาด (ตัดค่าว่าง/โมดูลที่ไม่รู้จักทิ้ง) */
export function normalizeModules(input: unknown): ModuleAccess {
  const out: ModuleAccess = {};
  if (input && typeof input === "object") {
    for (const { id } of MODULE_ROLES) {
      const v = (input as Record<string, unknown>)[id];
      if (typeof v === "string" && v) out[id] = v;
    }
  }
  return out;
}
