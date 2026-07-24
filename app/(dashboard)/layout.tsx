import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import PortalTopbar from "@/components/PortalTopbar";
import { cfg, getSessionUser } from "@/lib/auth";
import { hasModule } from "@/lib/modules";

// ต้อง render ทุก request — ไม่งั้น Next จะ prerender เป็น static ตั้งแต่ตอน build
// (ตอน build ไม่มี AUTH_ENABLED → โค้ดเช็ค login ถูกข้าม → cookies() ไม่ถูกเรียก → หน้ากลายเป็น static
//  แล้วตอนใช้งานจริงจะไม่มีการเช็ค session เลย = เห็นหน้าเปล่า + API ตอบ unauthorized แทนที่จะพาไป /login)
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (cfg.authEnabled) {
    const user = await getSessionUser();
    if (!user) redirect("/login");

    // ไม่ได้รับสิทธิ์โมดูล Dashboard → บอกตรงๆ (ใช้ waffle ไปโมดูลที่มีสิทธิ์ได้)
    if (!hasModule(user.modules, "dashboard", user.role)) {
      return (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#F8FAFC" }}>
          <PortalTopbar />
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "28px 32px", maxWidth: 440, textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>ยังไม่มีสิทธิ์เข้า Dashboard</div>
              <div style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.6 }}>
                ติดต่อผู้ดูแลระบบให้เปิดสิทธิ์ให้ที่ <b>ตั้งค่า → จัดการผู้ใช้งาน</b><br />
                หรือกดปุ่มตารางมุมขวาบนเพื่อไปโมดูลที่คุณมีสิทธิ์
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return <DashboardShell>{children}</DashboardShell>;
}
