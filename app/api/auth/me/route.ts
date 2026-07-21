import { cookies } from "next/headers";
import { cfg, verifySession, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = verifySession(token, cfg.authSecret);
  return Response.json({
    authEnabled: cfg.authEnabled,
    configured: !!(cfg.clientId && cfg.clientSecret && cfg.authSecret && cfg.dashboardUrl),
    user: user ? { email: user.email, name: user.name, role: user.role, perms: user.perms || null } : null,
  });
}
