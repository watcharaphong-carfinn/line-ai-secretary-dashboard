import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DashboardShell from "@/components/DashboardShell";
import { cfg, verifySession, SESSION_COOKIE } from "@/lib/auth";

// ต้อง render ทุก request — ไม่งั้น Next จะ prerender เป็น static ตั้งแต่ตอน build
// (ตอน build ไม่มี AUTH_ENABLED → โค้ดเช็ค login ถูกข้าม → cookies() ไม่ถูกเรียก → หน้ากลายเป็น static
//  แล้วตอนใช้งานจริงจะไม่มีการเช็ค session เลย = เห็นหน้าเปล่า + API ตอบ unauthorized แทนที่จะพาไป /login)
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // บังคับ login เฉพาะเมื่อ AUTH_ENABLED=true (กันล็อกตัวเองตอนยังตั้งค่าไม่เสร็จ)
  if (cfg.authEnabled) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!verifySession(token, cfg.authSecret)) redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
