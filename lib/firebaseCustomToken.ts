// ── สร้าง Firebase custom token ให้ project carfinn-carprice ────────────────────
// ราคารถเป็น static (อ่าน httpOnly cookie ไม่ได้) → IdP กลางออก custom token ให้แทน
// viewer เอาไป signInWithCustomToken() = auto login เงียบ ไม่ต้อง popup Google ซ้ำ
//
// custom token = JWT เซ็นด้วย service-account private key ของ project เป้าหมาย
//   (โครงสร้างตามสเปค Firebase — ไม่ต้องใช้ firebase-admin)
// env ที่ต้องตั้ง (prod): CARPRICE_SA_CLIENT_EMAIL + CARPRICE_SA_PRIVATE_KEY (PEM)
import crypto from "crypto";

const FIREBASE_AUD =
  "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

export function carpriceSaConfigured(): boolean {
  return !!(process.env.CARPRICE_SA_CLIENT_EMAIL && process.env.CARPRICE_SA_PRIVATE_KEY);
}

/**
 * ออก Firebase custom token
 * @param uid  รหัสผู้ใช้ (ใช้อีเมลเป็น uid — เสถียรต่อคน)
 * @param email อีเมล → ใส่เป็น claim `email` เพื่อให้ firestore.rules (request.auth.token.email) ทำงาน
 */
export function mintFirebaseCustomToken(uid: string, email: string): string {
  const clientEmail = process.env.CARPRICE_SA_CLIENT_EMAIL || "";
  const privateKey = (process.env.CARPRICE_SA_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!clientEmail || !privateKey) throw new Error("carprice SA not configured");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: FIREBASE_AUD,
    iat: now,
    exp: now + 3600, // Firebase จำกัดสูงสุด 1 ชม.
    uid,
    claims: { email }, // claim เสริม → โผล่ใน request.auth.token.email
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = crypto.createPrivateKey(privateKey);
  const sig = crypto.sign("RSA-SHA256", Buffer.from(signingInput), key).toString("base64url");
  return `${signingInput}.${sig}`;
}
