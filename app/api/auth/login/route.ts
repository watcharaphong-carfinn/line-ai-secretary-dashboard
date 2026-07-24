import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { cfg, STATE_COOKIE, SESSION_COOKIE, verifySession } from "@/lib/auth";
import { issueSsoToken, isAllowedReturn, RETURN_COOKIE, SSO_COOKIE, ssoCookieDomain } from "@/lib/sso";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cfg.clientId || !cfg.dashboardUrl) {
    return new Response("Auth not configured (GOOGLE_CLIENT_ID / DASHBOARD_URL)", { status: 503 });
  }

  // return URL (แอปอื่นส่ง user มา login แบบ SSO) — รับเฉพาะแอปในเครือ
  const reqUrl = new URL(req.url);
  const rawReturn = reqUrl.searchParams.get("return");
  const returnUrl = isAllowedReturn(rawReturn) ? rawReturn! : null;

  // ── SSO shortcut: ถ้า login IdP อยู่แล้ว (cf_session ใช้ได้) ไม่ต้องผ่าน Google ซ้ำ ──
  //   ออก cf_sso (เผื่อยังไม่มี/หมดอายุ) แล้วเด้งกลับแอปต้นทางทันที
  if (returnUrl) {
    const sess = verifySession((await cookies()).get(SESSION_COOKIE)?.value, cfg.authSecret);
    if (sess) {
      const res = NextResponse.redirect(returnUrl, 302);
      const ssoToken = issueSsoToken({ email: sess.email, name: sess.name, role: sess.role, perms: sess.perms, modules: sess.modules }, cfg.dashboardUrl);
      res.cookies.set(SSO_COOKIE, ssoToken, {
        httpOnly: true, secure: true, sameSite: "lax", path: "/",
        domain: ssoCookieDomain(), maxAge: 8 * 60 * 60,
      });
      return res;
    }
  }

  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: `${cfg.dashboardUrl}${cfg.redirectPath}`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  const domain = (process.env.ALLOWED_DOMAIN || "").trim();
  if (domain) params.set("hd", domain); // hint เฉพาะโดเมน

  // ตั้ง state cookie บน response โดยตรง (NextResponse) — เชื่อถือได้กว่า cookies().set()
  //   ตอน return plain Response.redirect (เคยทำให้ Set-Cookie หลุดบางครั้ง → error=state)
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 1800, // 30 นาที เผื่อเลือกบัญชีช้า
  });
  // จำ return URL ไว้พา user กลับแอปต้นทางหลัง callback (SSO)
  if (returnUrl) {
    res.cookies.set(RETURN_COOKIE, returnUrl, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 1800,
    });
  }
  return res;
}
