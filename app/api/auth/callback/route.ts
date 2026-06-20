import { cookies } from "next/headers";
import { cfg, signSession, resolveRole, logAudit, SESSION_COOKIE, STATE_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

function redirect(to: string) { return Response.redirect(`${cfg.dashboardUrl}${to}`, 302); }

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const savedState = jar.get(STATE_COOKIE)?.value;

  // CSRF: state ต้องตรง
  if (!code || !state || !savedState || state !== savedState) {
    return redirect("/login?error=state");
  }
  jar.delete(STATE_COOKIE);

  try {
    // แลก code → tokens (ตรงกับ Google ผ่าน HTTPS + client secret → เชื่อ id_token ได้)
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: `${cfg.dashboardUrl}${cfg.redirectPath}`,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenRes.ok) return redirect("/login?error=token");
    const tok = await tokenRes.json();

    // decode id_token (JWT payload) — เชื่อได้เพราะมาจาก token endpoint โดยตรง
    const payloadB64 = String(tok.id_token || "").split(".")[1];
    if (!payloadB64) return redirect("/login?error=idtoken");
    const claims = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

    const email: string = (claims.email || "").toLowerCase();
    if (!email || claims.email_verified === false) return redirect("/login?error=email");

    const role = await resolveRole(email);
    if (!role) { await logAudit("login_denied", email); return redirect("/login?error=denied"); }
    await logAudit("login", email, role);

    // ออก session cookie
    const token = signSession({ email, name: claims.name || email, role }, cfg.authSecret);
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60,
    });
    return redirect("/");
  } catch {
    return redirect("/login?error=server");
  }
}
