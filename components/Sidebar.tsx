"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BarChart3, Briefcase, Megaphone, Radio, ClipboardCheck,
  Server, Settings, Users, ClipboardList, Network, X, Send,
} from "lucide-react";
import { useDrawer } from "./drawer-context";
import { useAccess } from "./access-context";
import { canView, type Section } from "@/lib/sections";

// งานส่วนกลาง = ยอดปิด/ยอดขายจริงของทีมขาย (Google Sheets 3 ปี) — ภาพรวม+วิเคราะห์อยู่ในนี้เพราะเป็นข้อมูลยอดปิด
const NAV_CENTRAL = [
  { href: "/", label: "ภาพรวม · ยอดปิด", icon: LayoutDashboard },
  { href: "/customers", label: "ลูกค้า · ยอดปิด", icon: Briefcase },
  { href: "/followup", label: "ติดตามงานค้าง", icon: ClipboardCheck },
  { href: "/analytics", label: "วิเคราะห์ · Analytics", icon: BarChart3 },
];
// งานภายใน = ทีมการตลาด/Lead (ไฟล์ "รายชื่อส่งงาน ภายใน")
const NAV_INTERNAL = [
  { href: "/marketing", label: "การตลาด · Lead", icon: Megaphone },
];
// งานเซล = ผลการส่งงานของทีมเซล (ลีสซิ่ง/คนส่งงาน/เหตุผลไม่อนุมัติ) — สิทธิ์แยก section "sales"
const NAV_SALES = [
  { href: "/sales", label: "งานเซล · ส่งงาน", icon: Send },
];
// ดึงตัวเลขจริงจากแพลตฟอร์มโฆษณา — แยกจาก "การตลาด · Lead" (ที่ทีมกรอกเอง) จนกว่าจะลงตัวแล้วค่อยรวม
//   รายงาน = ของที่ดูบ่อย วางไว้บน · บัญชีโฆษณา = หน้าตั้งค่า
const NAV_ADS = [
  { href: "/ads/report", label: "รายงานโฆษณา", icon: BarChart3 },
  { href: "/ads", label: "บัญชีโฆษณา", icon: Radio },
];
const NAV_OPS = [
  { href: "/bot", label: "Bot Management", icon: Server },
];
const NAV_SYS = [
  { href: "/system", label: "โครงสร้างระบบ", icon: Network },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/users", label: "User Management", icon: Users },
  { href: "/audit", label: "Audit Logs", icon: ClipboardList },
];

function NavItem({ href, label, icon: Icon, active }: {
  href: string; label: string; icon: React.ElementType; active: boolean;
}) {
  const { setOpen } = useDrawer();
  return (
    <Link
      href={href}
      onClick={() => setOpen(false)} // ปิด drawer เมื่อเลือกเมนู (มือถือ)
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
        borderRadius: 9, textDecoration: "none", fontSize: 14, fontWeight: active ? 600 : 500,
        color: active ? "#fff" : "#94A3B8",
        background: active ? "#1E293B" : "transparent",
        position: "relative",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {active && (
        <span style={{
          position: "absolute", left: 0, top: 9, bottom: 9,
          width: 3, borderRadius: 3, background: "#2563EB",
        }} />
      )}
      <Icon size={19} color={active ? "#60A5FA" : "#94A3B8"} strokeWidth={2} />
      {label}
    </Link>
  );
}

function NavSection({ label, items, pathname }: {
  label: string; items: typeof NAV_CENTRAL; pathname: string;
}) {
  return (
    <>
      <div style={{
        fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", color: "#475569",
        textTransform: "uppercase", padding: "20px 10px 10px",
      }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {items.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} />
        ))}
      </div>
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useDrawer();
  const { user } = useAccess();
  const show = (s: Section) => canView(user, s); // super_admin เห็นหมด · คนอื่นตามสิทธิ์ · ยังโหลดไม่เสร็จ (user=null) = ซ่อนไว้ก่อน
  return (
    <aside className={`app-sidebar${open ? " open" : ""}`} style={{
      width: 280, flexShrink: 0, background: "#0F172A",
      display: "flex", flexDirection: "column", height: "100vh",
      position: "sticky", top: 0,
    }}>
      {/* Logo — ไอคอนมาร์ก CarFinn (กล่องฟ้าไล่เฉด) + ชื่อ CarFinn AI */}
      <div style={{
        padding: "22px 18px 18px", display: "flex", alignItems: "center", gap: 11,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/carfinn-mark.png" alt="CarFinn AI" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: "block" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: "0.01em" }}>CarFinn AI</div>
          <div style={{ color: "#64748B", fontSize: 11 }}>Finance Operations Platform</div>
        </div>
        {/* ปุ่มปิด drawer (เฉพาะมือถือ) */}
        <button className="mobile-only" onClick={() => setOpen(false)} aria-label="ปิดเมนู" style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          border: "none", background: "rgba(255,255,255,0.06)", cursor: "pointer",
          alignItems: "center", justifyContent: "center",
        }}>
          <X size={18} color="#94A3B8" />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "18px 14px", overflowY: "auto" }}>
        {show("central") && (<>
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", color: "#475569",
            textTransform: "uppercase", padding: "0 10px 10px",
          }}>งานส่วนกลาง (ยอดขาย)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {NAV_CENTRAL.map((item) => (
              <NavItem key={item.href} {...item} active={pathname === item.href} />
            ))}
          </div>
        </>)}
        {show("marketing") && <NavSection label="งานภายใน (การตลาด/Lead)" items={NAV_INTERNAL} pathname={pathname} />}
        {show("sales") && <NavSection label="งานเซล" items={NAV_SALES} pathname={pathname} />}
        {show("ads") && <NavSection label="Ads Platform" items={NAV_ADS} pathname={pathname} />}
        {show("admin") && <NavSection label="Operations" items={NAV_OPS} pathname={pathname} />}
        {show("admin") && <NavSection label="System" items={NAV_SYS} pathname={pathname} />}
      </nav>
    </aside>
  );
}
