import { cookies } from "next/headers";
import { cfg, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  (await cookies()).delete(SESSION_COOKIE);
  return Response.redirect(`${cfg.dashboardUrl || ""}/login`, 302);
}
