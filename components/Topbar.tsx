"use client";
// ⚠️ แถบบนย้ายไปอยู่ที่ layout แล้ว (components/PortalTopbar.tsx ผ่าน DashboardShell)
// เพื่อให้พาดเต็มความกว้างด้านบนสุด เหมือนโมดูลที่ฝังใน portal
// component นี้เก็บไว้เป็น no-op เพราะหน้าต่างๆ ยังเรียกใช้อยู่ (ทยอยลบออกจากหน้าได้ภายหลัง)

interface TopbarProps {
  breadcrumb: string[];
  title: string;
  synced?: boolean;
}

export default function Topbar(props: TopbarProps) {
  void props; // ไม่ใช้แล้ว (แถบย้ายไป layout) — อ้างไว้กัน lint unused
  return null;
}
