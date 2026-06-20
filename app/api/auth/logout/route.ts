import { cookies } from "next/headers";
import { cfg, getSessionUser, logAudit, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getSessionUser();
  if (u) await logAudit("logout", u.email);
  (await cookies()).delete(SESSION_COOKIE);
  return Response.redirect(`${cfg.dashboardUrl || ""}/login`, 302);
}
