import { cookies } from "next/headers";
import { verifySsoToken, SSO_COOKIE } from "@/lib/sso";
import { mintFirebaseCustomToken, carpriceSaConfigured } from "@/lib/firebaseCustomToken";

export const dynamic = "force-dynamic";

// origin ของราคารถ (cross-subdomain) — ต้องระบุชัด (ใช้ credentials จึงใช้ * ไม่ได้)
function corsOrigin(): string {
  return process.env.CARPRICE_ORIGIN || "https://carprice.carfinn.com";
}
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": corsOrigin(),
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// GET — ราคารถ (viewer) fetch พร้อม credentials → รับ Firebase custom token กลับไป signInWithCustomToken
export async function GET() {
  const h = corsHeaders();

  if (!carpriceSaConfigured()) {
    return Response.json({ error: "not_configured" }, { status: 503, headers: h });
  }

  const ssoToken = (await cookies()).get(SSO_COOKIE)?.value;
  let claims;
  try {
    claims = ssoToken ? verifySsoToken(ssoToken) : null;
  } catch {
    claims = null;
  }
  if (!claims) {
    return Response.json({ error: "no_sso" }, { status: 401, headers: h });
  }

  const email = claims.sub.toLowerCase();
  try {
    const token = mintFirebaseCustomToken(email, email);
    return Response.json({ token }, { headers: h });
  } catch {
    return Response.json({ error: "mint_failed" }, { status: 500, headers: h });
  }
}
