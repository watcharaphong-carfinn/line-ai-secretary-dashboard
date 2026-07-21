"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { type Perms, type Section, routeSection, canView, firstViewable, SECTION_LABELS } from "@/lib/sections";

interface AccessUser { email: string; name?: string; role: string; perms?: Perms | null }
interface Ctx { user: AccessUser | null; loading: boolean }
const AccessCtx = createContext<Ctx>({ user: null, loading: true });
export const useAccess = () => useContext(AccessCtx);

// route ที่ไม่ต้องคุมสิทธิ์รายหัวข้อ (เข้าได้ทุกคนที่ login)
const OPEN_ROUTES = ["/no-access", "/settings-profile"];
const sectionHref: Record<Section, string> = { central: "/", marketing: "/marketing", ads: "/ads/report", admin: "/bot" };

export default function AccessProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AccessUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user || null)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // กันหน้า: ถ้าเข้าหัวข้อที่ไม่มีสิทธิ์ดู → เด้งไปหัวข้อแรกที่ดูได้ (ความปลอดภัยจริงอยู่ที่ API)
  useEffect(() => {
    if (loading || !user) return;
    if (OPEN_ROUTES.some(r => pathname.startsWith(r))) return;
    const sec = routeSection(pathname);
    if (!canView(user, sec)) {
      const fv = firstViewable(user);
      router.replace(fv ? sectionHref[fv] : "/no-access");
    }
  }, [loading, user, pathname, router]);

  return <AccessCtx.Provider value={{ user, loading }}>{children}</AccessCtx.Provider>;
}

export { SECTION_LABELS };
