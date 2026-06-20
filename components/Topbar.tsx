"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, Search, ChevronRight, Menu, LogOut } from "lucide-react";
import { useDrawer } from "./drawer-context";

interface TopbarProps {
  breadcrumb: string[];
  title: string;
  synced?: boolean;
}

interface Me { email: string; name?: string; role: string }
const ROLE_LABEL: Record<string, string> = { super_admin: "Super Admin", admin: "Admin", viewer: "Viewer" };

export default function Topbar({ breadcrumb, title, synced = true }: TopbarProps) {
  const { toggle } = useDrawer();
  const [user, setUser] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user)).catch(() => {});
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initial = ((user?.name || user?.email || "U").trim()[0] || "U").toUpperCase();
  const roleLabel = user ? (ROLE_LABEL[user.role] || user.role) : "";

  return (
    <header className="app-topbar" style={{
      height: 72, flexShrink: 0, background: "#fff",
      borderBottom: "1px solid #E2E8F0",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 28px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {/* Hamburger (เฉพาะมือถือ) */}
        <button className="mobile-only" onClick={toggle} aria-label="เปิดเมนู" style={{
          width: 38, height: 38, borderRadius: 9, flexShrink: 0,
          border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer",
          alignItems: "center", justifyContent: "center",
        }}>
          <Menu size={19} color="#334155" />
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>
            {breadcrumb.map((item, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <ChevronRight size={13} color="#CBD5E1" strokeWidth={2.4} />}
                <span style={i === breadcrumb.length - 1 ? { color: "#475569", fontWeight: 600 } : {}}>{item}</span>
              </span>
            ))}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Search (ซ่อนบนมือถือ) */}
        <div className="desktop-only" style={{
          display: "flex", alignItems: "center", gap: 9, width: 300,
          border: "1px solid #E2E8F0", borderRadius: 10, padding: "9px 13px", background: "#F8FAFC",
        }}>
          <Search size={16} color="#94A3B8" />
          <span style={{ fontSize: 13, color: "#94A3B8" }}>ค้นหา…</span>
          <span style={{
            marginLeft: "auto", fontSize: 11, color: "#CBD5E1",
            border: "1px solid #E2E8F0", borderRadius: 5, padding: "1px 5px",
          }}>⌘K</span>
        </div>

        {/* Notifications */}
        <button style={{
          position: "relative", width: 38, height: 38, borderRadius: 9,
          border: "1px solid #E2E8F0", background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <Bell size={18} color="#64748B" />
          <span style={{
            position: "absolute", top: 8, right: 8, width: 7, height: 7,
            borderRadius: "50%", background: "#EF4444", border: "1.5px solid #fff",
          }} />
        </button>

        {/* Sync status (ซ่อนบนมือถือ ประหยัดที่) */}
        <div className="desktop-only" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 12, fontWeight: 600,
          color: synced ? "#059669" : "#D97706",
          background: synced ? "#ECFDF5" : "#FFFBEB",
          padding: "7px 11px", borderRadius: 9,
        }}>
          <span className="pulse" style={{
            width: 7, height: 7, borderRadius: "50%",
            background: synced ? "#10B981" : "#F59E0B",
            display: "inline-block",
          }} />
          {synced ? "Synced" : "Syncing…"}
        </div>

        {/* Avatar + dropdown (ปุ่มเล็ก คลิกเปิดเมนู → logout) */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button onClick={() => setOpen(o => !o)} aria-label="บัญชีผู้ใช้" title={user?.email || ""} style={{
            width: 38, height: 38, borderRadius: "50%", background: "#2563EB",
            color: "#fff", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{initial}</button>

          {open && (
            <div style={{
              position: "absolute", right: 0, top: 46, width: 240, zIndex: 60,
              background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12,
              boxShadow: "0 12px 32px rgba(15,23,42,.16)", overflow: "hidden",
            }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "ผู้ใช้"}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email || "ยังไม่ได้เข้าสู่ระบบ"}</div>
                {roleLabel && (
                  <span style={{ display: "inline-block", marginTop: 6, fontSize: 10.5, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 999 }}>{roleLabel}</span>
                )}
              </div>
              <a href="/api/auth/logout" style={{
                display: "flex", alignItems: "center", gap: 9, padding: "12px 16px",
                fontSize: 13.5, fontWeight: 600, color: "#DC2626", textDecoration: "none",
              }}>
                <LogOut size={16} /> ออกจากระบบ
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
