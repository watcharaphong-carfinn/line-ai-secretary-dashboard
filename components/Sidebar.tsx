"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, BarChart3, TrendingUp,
  Server, RefreshCw, Settings, Users, ClipboardList, LogOut, X,
} from "lucide-react";
import { useDrawer } from "./drawer-context";

const NAV_MAIN = [
  { href: "/", label: "ภาพรวมระบบ", icon: LayoutDashboard },
  { href: "/reports", label: "รายงาน · Reports", icon: FileText },
  { href: "/analytics", label: "วิเคราะห์ · Analytics", icon: BarChart3 },
  { href: "/performance", label: "Financing Performance", icon: TrendingUp },
];
const NAV_OPS = [
  { href: "/bot", label: "Bot Management", icon: Server },
  { href: "/sync", label: "Sync Center", icon: RefreshCw },
];
const NAV_SYS = [
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
  label: string; items: typeof NAV_MAIN; pathname: string;
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
  return (
    <aside className={`app-sidebar${open ? " open" : ""}`} style={{
      width: 280, flexShrink: 0, background: "#0F172A",
      display: "flex", flexDirection: "column", height: "100vh",
      position: "sticky", top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: "22px 22px 20px", display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 11, background: "#2563EB",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>
          </svg>
        </div>
        <div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: "0.02em" }}>CARFINN</div>
          <div style={{ color: "#64748B", fontSize: 11 }}>Finance Operations Platform</div>
        </div>
        {/* ปุ่มปิด drawer (เฉพาะมือถือ) */}
        <button className="mobile-only" onClick={() => setOpen(false)} aria-label="ปิดเมนู" style={{
          marginLeft: "auto", width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          border: "none", background: "rgba(255,255,255,0.06)", cursor: "pointer",
          alignItems: "center", justifyContent: "center",
        }}>
          <X size={18} color="#94A3B8" />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "18px 14px", overflowY: "auto" }}>
        <div style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", color: "#475569",
          textTransform: "uppercase", padding: "0 10px 10px",
        }}>Main Menu</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV_MAIN.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href} />
          ))}
        </div>
        <NavSection label="Operations" items={NAV_OPS} pathname={pathname} />
        <NavSection label="System" items={NAV_SYS} pathname={pathname} />
      </nav>

      {/* User */}
      <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 11,
          padding: "8px 10px", borderRadius: 11, background: "#1E293B",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: "#2563EB",
            color: "#fff", fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>SA</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontSize: 13.5, fontWeight: 600 }}>สมชาย ธนกิจ</div>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 10.5, fontWeight: 600, color: "#60A5FA",
              background: "rgba(37,99,235,0.16)", padding: "1px 7px",
              borderRadius: 999, marginTop: 2,
            }}>Super Admin</span>
          </div>
          <LogOut size={17} color="#64748B" />
        </div>
      </div>
    </aside>
  );
}
