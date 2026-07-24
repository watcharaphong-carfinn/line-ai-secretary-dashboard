// ── SSO กลางของ Carfinn — ออก/ตรวจ JWT เซ็น RS256 + เปิด JWKS ให้แอปอื่น verify เอง ───
// internal.carfinn.com = IdP กลาง · ออก cookie `cf_sso` scope `.carfinn.com`
// แอปอื่น (agent/prices) ดึง public key จาก /.well-known/jwks.json มา verify — ไม่ต้องแชร์ secret
//
// คีย์ production: ตั้ง env `SSO_PRIVATE_KEY` เป็น RSA private key (PEM, PKCS8)
//   สร้างด้วย: openssl genpkey -algorithm RSA -pkcs8 -out sso.pem -pkeyopt rsa_keygen_bits:2048
// ถ้าไม่มี env (เฉพาะ dev/local) → สร้างคีย์ชั่วคราวในหน่วยความจำ (JWKS จะตรงกันในโปรเซสเดียว)
import crypto, { type KeyObject } from "crypto";
import { type Perms } from "./sections";

// ต้องชื่อ __session — Firebase Hosting (agent/prices) ส่งต่อได้แค่ cookie ชื่อนี้เท่านั้น
export const SSO_COOKIE = "__session";
const SSO_TTL_SEC = 8 * 60 * 60; // 8 ชม. (สั้นกว่า cf_session เพราะข้ามโดเมน)

export interface SsoClaims {
  iss: string;
  sub: string;   // email
  name: string;
  role: string;
  perms?: Perms;
  iat: number;
  exp: number;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

// ── โหลด/สร้างคีย์ (ครั้งเดียวต่อโปรเซส) ─────────────────────────────────────────
let _priv: KeyObject | null = null;
let _pub: KeyObject | null = null;
let _kid = "";
let _devWarned = false;

function keys(): { priv: KeyObject; pub: KeyObject; kid: string } {
  if (_priv && _pub) return { priv: _priv, pub: _pub, kid: _kid };

  const pem = (process.env.SSO_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (pem) {
    _priv = crypto.createPrivateKey(pem);
    _pub = crypto.createPublicKey(_priv);
  } else {
    if (!_devWarned) { console.warn("[sso] SSO_PRIVATE_KEY ไม่ถูกตั้ง — ใช้คีย์ชั่วคราว (dev เท่านั้น)"); _devWarned = true; }
    const kp = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    _priv = kp.privateKey;
    _pub = kp.publicKey;
  }
  _kid = thumbprint(_pub);
  return { priv: _priv, pub: _pub, kid: _kid };
}

// RFC 7638 JWK thumbprint (kid คงที่ต่อคีย์)
function thumbprint(pub: KeyObject): string {
  const jwk = pub.export({ format: "jwk" }) as { n: string; e: string; kty: string };
  const canon = JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n });
  return crypto.createHash("sha256").update(canon).digest("base64url");
}

// ── ออก token ───────────────────────────────────────────────────────────────
export function issueSsoToken(u: { email: string; name?: string; role: string; perms?: Perms }, issuer: string): string {
  const { priv, kid } = keys();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid };
  const payload: SsoClaims = {
    iss: issuer, sub: u.email.toLowerCase(), name: u.name || u.email,
    role: u.role, perms: u.perms, iat: now, exp: now + SSO_TTL_SEC,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(signingInput), priv).toString("base64url");
  return `${signingInput}.${sig}`;
}

// ── ตรวจ token (สำหรับใช้ในแอปเดียวกัน; แอปอื่นใช้ JWKS) ─────────────────────────
export function verifySsoToken(token: string | undefined): SsoClaims | null {
  if (!token || token.split(".").length !== 3) return null;
  const { pub } = keys();
  const [h, p, s] = token.split(".");
  try {
    const ok = crypto.verify("RSA-SHA256", Buffer.from(`${h}.${p}`), pub, Buffer.from(s, "base64url"));
    if (!ok) return null;
    const claims = JSON.parse(Buffer.from(p, "base64url").toString()) as SsoClaims;
    if (!claims.exp || Math.floor(Date.now() / 1000) > claims.exp) return null;
    return claims;
  } catch { return null; }
}

// ── JWKS (public key) — เสิร์ฟที่ /.well-known/jwks.json ────────────────────────
export function jwks(): { keys: Array<Record<string, string>> } {
  const { pub, kid } = keys();
  const jwk = pub.export({ format: "jwk" }) as { n: string; e: string; kty: string };
  return { keys: [{ kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", use: "sig", kid }] };
}

// domain สำหรับ cookie ข้าม subdomain (`.carfinn.com`) — ตั้งผ่าน env, ปิดได้ตอน dev
export function ssoCookieDomain(): string | undefined {
  return process.env.SSO_COOKIE_DOMAIN || undefined; // เช่น ".carfinn.com"
}

// cookie พก return URL ผ่าน OAuth roundtrip (แอปที่ส่ง user มา login จะได้เด้งกลับถูกที่)
export const RETURN_COOKIE = "cf_sso_return";

// ── กัน open-redirect: return URL ต้องเป็นแอปในเครือเท่านั้น ─────────────────────
//   อนุญาต host ที่ลงท้าย .carfinn.com (+ carfinn.com) และ localhost ตอน dev
//   ปรับ allowlist เพิ่มได้ผ่าน env `SSO_ALLOWED_RETURN_HOSTS` (คั่นด้วย ,)
export function isAllowedReturn(returnUrl: string | null | undefined): boolean {
  if (!returnUrl) return false;
  let u: URL;
  try { u = new URL(returnUrl); } catch { return false; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const host = u.hostname.toLowerCase();

  const extra = (process.env.SSO_ALLOWED_RETURN_HOSTS || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (extra.includes(host)) return true;

  if (host === "carfinn.com" || host.endsWith(".carfinn.com")) return true;
  if (host === "localhost" || host === "127.0.0.1") return true; // dev
  return false;
}
