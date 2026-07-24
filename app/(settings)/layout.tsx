import { redirect } from "next/navigation";
import { cfg, getSessionUser, canView } from "@/lib/auth";
import PortalTopbar from "@/components/PortalTopbar";
import SettingsNav from "@/components/SettingsNav";

// โมดูล "ตั้งค่า" — เข้าจากปุ่ม waffle (เฉพาะผู้ดูแล)
// โครงเดียวกับโมดูลอื่น: แถบบนพาดเต็มความกว้าง → เมนู+เนื้อหาอยู่ใต้
export const dynamic = "force-dynamic";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  if (cfg.authEnabled) {
    const user = await getSessionUser();
    if (!user) redirect("/login");
    if (!canView(user, "admin")) redirect("/no-access");
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PortalTopbar />
      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        <SettingsNav />
        <main style={{ flex: 1, overflow: "auto", background: "#F8FAFC" }}>{children}</main>
      </div>
    </div>
  );
}
