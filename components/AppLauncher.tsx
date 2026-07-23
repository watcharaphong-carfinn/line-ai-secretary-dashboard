"use client";
// ── ปุ่ม waffle 9 จุด แบบ Google Workspace ────────────────────────────────────
// คลิก → เปิด popover ตารางไทล์โมดูล เลือกเข้าแต่ละโมดูลได้
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Car, Wallet, Grip } from "lucide-react";
import { MODULES, moduleHref, currentModuleId, type PortalModule } from "@/lib/modules";

const ICONS = {
  dashboard: LayoutDashboard,
  agent: Users,
  prices: Car,
  plus: Wallet,
} as const;

export default function AppLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = currentModuleId(pathname);

  // ปิดเมื่อคลิกนอกกล่อง / กด Esc
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="เมนูแอป Carfinn"
        aria-expanded={open}
        title="แอป Carfinn"
        style={{
          width: 38, height: 38, borderRadius: 9, flexShrink: 0,
          border: "1px solid #E2E8F0", background: open ? "#F1F5F9" : "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          transition: "background .12s",
        }}
      >
        <Grip size={19} color="#475569" />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", right: 0, top: 48, width: 320, zIndex: 70,
            background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16,
            boxShadow: "0 16px 44px rgba(15,23,42,.18)", padding: 14,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".04em", padding: "2px 6px 10px" }}>
            แอปของ CARFINN
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
            {MODULES.map((m) => (
              <Tile key={m.id} m={m} active={m.id === current} onNavigate={() => setOpen(false)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ m, active, onNavigate }: { m: PortalModule; active: boolean; onNavigate: () => void }) {
  const Icon = ICONS[m.icon];
  const disabled = !!m.comingSoon;

  const inner = (
    <>
      <div
        style={{
          width: 46, height: 46, borderRadius: 13, marginBottom: 8,
          background: disabled ? "#E2E8F0" : m.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: disabled ? "none" : `0 4px 12px ${m.color}33`,
        }}
      >
        <Icon size={23} color="#fff" strokeWidth={2.1} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1E293B", lineHeight: 1.2 }}>{m.label}</div>
      <div style={{ fontSize: 10.5, color: "#94A3B8", marginTop: 2, lineHeight: 1.25 }}>
        {disabled ? "เร็วๆ นี้" : m.sublabel}
      </div>
    </>
  );

  const box: React.CSSProperties = {
    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
    padding: "14px 8px 12px", borderRadius: 12, textDecoration: "none",
    border: active ? "1px solid #BFDBFE" : "1px solid transparent",
    background: active ? "#EFF6FF" : "transparent",
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? "default" : "pointer",
  };

  if (disabled) return <div style={box}>{inner}</div>;

  return (
    <a
      href={moduleHref(m)}
      onClick={onNavigate}
      style={box}
      className="app-launcher-tile"
    >
      {inner}
    </a>
  );
}
