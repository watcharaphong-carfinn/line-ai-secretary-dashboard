import { jwks } from "@/lib/sso";

export const dynamic = "force-dynamic";

// public key ของ SSO — แอปอื่น (agent/prices) ดึงมา verify JWT `cf_sso`
// เสิร์ฟจริงที่ /.well-known/jwks.json (rewrite ใน next.config.ts)
export async function GET() {
  return Response.json(jwks(), {
    headers: { "Cache-Control": "public, max-age=3600, must-revalidate" },
  });
}
