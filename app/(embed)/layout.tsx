import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import EmbedTopbar from "@/components/EmbedTopbar";
import { cfg, verifySession, SESSION_COOKIE } from "@/lib/auth";

// โมดูลที่ฝังใน shell (agent/prices) — แถบบนคงที่ + iframe เต็มจอ
export const dynamic = "force-dynamic";

export default async function EmbedLayout({ children }: { children: React.ReactNode }) {
  if (cfg.authEnabled) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!verifySession(token, cfg.authSecret)) redirect("/login");
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#F8FAFC" }}>
      <EmbedTopbar />
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}
