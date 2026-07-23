// ── ทะเบียนโมดูลของ Internal Portal (internal.carfinn.com) ─────────────────────
// ส่วนบริสุทธิ์ ไม่มี server-only import → ใช้ได้ทั้ง client + server
// ปุ่ม waffle (AppLauncher) อ่านจากที่นี่ เพื่อสลับเข้าแต่ละโมดูลแบบ Google Workspace
//
// การย้ายโมดูลเข้ามา native ทำทีละตัว:
//   - ยังไม่ย้าย → ตั้ง href เป็น externalUrl (ลิงก์ออก subdomain เดิม, เปิดใช้ได้ทันที)
//   - ย้ายแล้ว   → ตั้ง internalPath (route ภายใน portal นี้) แล้ว helper จะเลือก path ในทันที

export type ModuleId = "dashboard" | "agent" | "prices" | "plus";

export interface PortalModule {
  id: ModuleId;
  label: string;        // ชื่อโมดูล
  sublabel: string;     // คำอธิบายสั้น (ใต้ชื่อในไทล์)
  /** route ภายใน portal — ตั้งเมื่อย้ายโมดูลเข้ามา native แล้ว */
  internalPath?: string;
  /** ลิงก์ subdomain เดิม — ใช้ระหว่างยังไม่ย้าย (Phase 1) */
  externalUrl?: string;
  /** ชื่อ icon ของ lucide-react (map ใน AppLauncher) */
  icon: "dashboard" | "agent" | "prices" | "plus";
  /** สีประจำโมดูล (พื้นไอคอนในไทล์) */
  color: string;
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
    externalUrl: "https://admin-agent.carfinn.com",
    icon: "agent",
    color: "#10B981",
  },
  {
    id: "prices",
    label: "ราคารถ",
    sublabel: "ราคากลาง · มือสอง · ป้ายแดง",
    externalUrl: "https://carprice.carfinn.com",
    icon: "prices",
    color: "#F59E0B",
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

/** โมดูลนี้เปิดในหน้าต่างเดียวกันไหม (internal = ใช่, external subdomain = ใช่เช่นกันแต่คนละแอป) */
export function isExternal(m: PortalModule): boolean {
  return !m.internalPath && !!m.externalUrl;
}

/** โมดูลปัจจุบันจาก pathname (สำหรับไฮไลต์ไทล์ที่กำลังใช้) */
export function currentModuleId(pathname: string): ModuleId {
  if (pathname.startsWith("/agent")) return "agent";
  if (pathname.startsWith("/prices")) return "prices";
  return "dashboard";
}
