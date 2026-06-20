import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DashboardShell from "@/components/DashboardShell";
import { cfg, verifySession, SESSION_COOKIE } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // บังคับ login เฉพาะเมื่อ AUTH_ENABLED=true (กันล็อกตัวเองตอนยังตั้งค่าไม่เสร็จ)
  if (cfg.authEnabled) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!verifySession(token, cfg.authSecret)) redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
