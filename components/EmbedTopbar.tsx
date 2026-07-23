"use client";
// ── แถบบนคงที่ของ shell (โมดูลฝังใน iframe ใต้แถบนี้) ───────────────────────────
// แถบนี้อยู่ใน (embed)/layout → คงที่ตลอด สลับโมดูลแล้วไม่ reload/ขยับ
import { usePathname } from "next/navigation";
import AppLauncher from "./AppLauncher";
import { MODULES, currentModuleId } from "@/lib/modules";

export default function EmbedTopbar() {
  const pathname = usePathname();
  const cur = currentModuleId(pathname);
  const mod = MODULES.find((m) => m.id === cur);

  return (
    <header
      style={{
        height: 64, flexShrink: 0, background: "#fff",
        borderBottom: "1px solid #E2E8F0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/carfinn-mark.png" alt="CarFinn AI" style={{ width: 34, height: 34, borderRadius: 9, display: "block" }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: "#0F172A", lineHeight: 1.1 }}>
            {mod?.label ?? "CarFinn AI"}
          </div>
          <div style={{ fontSize: 11.5, color: "#94A3B8", lineHeight: 1.2 }}>{mod?.sublabel ?? ""}</div>
        </div>
      </div>

      <AppLauncher />
    </header>
  );
}
