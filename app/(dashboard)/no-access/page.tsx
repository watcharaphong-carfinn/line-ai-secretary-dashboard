"use client";
import Topbar from "@/components/Topbar";
import { ShieldAlert } from "lucide-react";

export default function NoAccessPage() {
  return (
    <>
      <Topbar breadcrumb={["ไม่มีสิทธิ์"]} title="ยังไม่ได้รับสิทธิ์" />
      <div className="page-body" style={{ padding: "26px 28px" }}>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "40px 24px", textAlign: "center", maxWidth: 520, margin: "40px auto" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <ShieldAlert size={28} color="#D97706" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>บัญชีของคุณยังไม่ได้รับสิทธิ์เข้าถึงหัวข้อใด</div>
          <div style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.7 }}>
            คุณเข้าสู่ระบบด้วยอีเมล Carfinn สำเร็จแล้ว แต่ผู้ดูแลระบบยังไม่ได้กำหนดสิทธิ์ให้<br />
            กรุณาติดต่อผู้ดูแลระบบ (Super Admin) เพื่อขอสิทธิ์เข้าถึงหัวข้อที่ต้องใช้งาน
          </div>
        </div>
      </div>
    </>
  );
}
