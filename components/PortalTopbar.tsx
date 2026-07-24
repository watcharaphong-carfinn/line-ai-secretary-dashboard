"use client";
// ── แถบบนกลางของ portal — ใช้ร่วมกันทั้ง Dashboard และโมดูลที่ฝัง (shell) ─────────
// พาดเต็มความกว้างด้านบนสุดเสมอ (sidebar ของแต่ละโมดูลอยู่ใต้แถบนี้) → ทุกหน้าโครงเดียวกัน
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, LogOut, UserCog } from "lucide-react";
import AppLauncher from "./AppLauncher";
import { MODULES, currentModuleId } from "@/lib/modules";

interface Me { email: string; name?: string; role?: string; perms?: Record<string, { v?: boolean }> }

export default function PortalTopbar({ onMenu }: { onMenu?: () => void }) {
  const pathname = usePathname();
  const mod = MODULES.find((m) => m.id === currentModuleId(pathname));

  const [user, setUser] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
  }, []);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initial = ((user?.name || user?.email || "U").trim()[0] || "U").toUpperCase();

  return (
    <header style={{
      height: 64, flexShrink: 0, background: "#fff",
      borderBottom: "1px solid #E2E8F0",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 28px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {onMenu && (
          <button className="mobile-only" onClick={onMenu} aria-label="เปิดเมนู" style={{
            width: 38, height: 38, borderRadius: 9, flexShrink: 0,
            border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer",
            alignItems: "center", justifyContent: "center",
          }}>
            <Menu size={19} color="#334155" />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {mod?.label ?? "CarFinn AI"}
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.2 }}>{mod?.sublabel ?? ""}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <AppLauncher />
        <div ref={ref} style={{ position: "relative" }}>
          <button onClick={() => setOpen((o) => !o)} aria-label="บัญชีผู้ใช้" title={user?.email || ""} style={{
            width: 38, height: 38, borderRadius: "50%", background: "#2563EB",
            color: "#fff", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{initial}</button>
          {open && (
            <div style={{
              position: "absolute", right: 0, top: 46, width: 230, zIndex: 60,
              background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12,
              boxShadow: "0 12px 32px rgba(15,23,42,.16)", overflow: "hidden",
            }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "ผู้ใช้"}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email || ""}</div>
              </div>
              {/* จัดการผู้ใช้รวมที่เดียว — เข้าได้จากทุกโมดูล (เฉพาะผู้ดูแล) */}
              {(user?.role === "super_admin" || user?.perms?.admin?.v) && (
                <a href="/users" style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", fontSize: 13.5, fontWeight: 600, color: "#334155", textDecoration: "none", borderBottom: "1px solid #F1F5F9" }}>
                  <UserCog size={16} /> จัดการผู้ใช้และสิทธิ์
                </a>
              )}
              <a href="/api/auth/logout" style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", fontSize: 13.5, fontWeight: 600, color: "#DC2626", textDecoration: "none" }}>
                <LogOut size={16} /> ออกจากระบบ
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
