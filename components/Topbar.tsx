"use client";
import { Bell, Search, ChevronRight, Menu } from "lucide-react";
import { useDrawer } from "./drawer-context";

interface TopbarProps {
  breadcrumb: string[];
  title: string;
  synced?: boolean;
}

export default function Topbar({ breadcrumb, title, synced = true }: TopbarProps) {
  const { toggle } = useDrawer();
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

        {/* Sync status */}
        <div style={{
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

        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: "50%", background: "#2563EB",
          color: "#fff", fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>SA</div>
      </div>
    </header>
  );
}
