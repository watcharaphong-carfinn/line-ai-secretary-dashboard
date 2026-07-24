"use client";
// เมนูของโมดูล "ตั้งค่า" — เพิ่มหัวข้อใหม่ได้ที่ ITEMS ที่เดียว
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";

const ITEMS = [
  { href: "/users", label: "จัดการผู้ใช้งาน", icon: Users },
];

export default function SettingsNav() {
  const pathname = usePathname();
  return (
    <aside style={{ width: 240, flexShrink: 0, background: "#0F172A", padding: "18px 12px", overflowY: "auto" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: ".06em", padding: "0 10px 10px" }}>
        ตั้งค่าระบบ
      </div>
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 9, marginBottom: 4,
              fontSize: 13.5, fontWeight: 600, textDecoration: "none",
              color: active ? "#fff" : "#94A3B8",
              background: active ? "#2563EB" : "transparent",
            }}
          >
            <Icon size={17} /> {label}
          </Link>
        );
      })}
    </aside>
  );
}
