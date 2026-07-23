import { NextResponse } from "next/server";
import crypto from "crypto";
import { cfg, STATE_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!cfg.clientId || !cfg.dashboardUrl) {
    return new Response("Auth not configured (GOOGLE_CLIENT_ID / DASHBOARD_URL)", { status: 503 });
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
  return res;
}
