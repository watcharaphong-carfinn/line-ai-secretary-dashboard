import crypto from "crypto";

// ส่งอีเมลผ่าน Gmail API — service account impersonate ผู้ใช้ Workspace (domain-wide delegation)
// ใช้ SA + delegation ชุดเดียวกับ Propfinn (noreply@carfinn.com) — อ่าน config จาก env ทั้งหมด
//   GCS_CLIENT_EMAIL / GCS_PRIVATE_KEY (base64 ของ PEM หรือ PEM ตรงๆ) · GMAIL_SENDER=noreply@carfinn.com
//   EMAIL_FROM="CarFinn Dashboard <noreply@carfinn.com>"
// ถ้ายังไม่ตั้งค่า → no-op คืน { skipped }

const GMAIL_SENDER = process.env.GMAIL_SENDER || "noreply@carfinn.com";
const CLIENT_EMAIL = process.env.GCS_CLIENT_EMAIL || "";
const FROM = process.env.EMAIL_FROM || `CarFinn Dashboard <${GMAIL_SENDER}>`;

function loadKey(): string | null {
  let k = process.env.GCS_PRIVATE_KEY;
  if (!k) return null;
  k = k.trim();
  if (!k.includes("BEGIN")) {
    try { const dec = Buffer.from(k, "base64").toString("utf8"); if (dec.includes("BEGIN")) k = dec; } catch {}
  }
  return k.replace(/\\n/g, "\n");
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

let cachedToken: { token: string; exp: number } | null = null;

// ขอ access token แบบ delegated (sub = GMAIL_SENDER) ด้วย SA JWT — ไม่ต้องพึ่ง google-auth-library
async function getToken(): Promise<string | null> {
  const key = loadKey();
  if (!key || !CLIENT_EMAIL) return null;
  if (cachedToken && Date.now() < cachedToken.exp - 60000) return cachedToken.token;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/gmail.send",
    aud: "https://oauth2.googleapis.com/token",
    sub: GMAIL_SENDER,   // impersonate ผู้ใช้ Workspace (ต้องมี domain-wide delegation)
    iat: now, exp: now + 3600,
  }));
  const signature = b64url(crypto.sign("RSA-SHA256", Buffer.from(`${header}.${claim}`), key));
  const jwt = `${header}.${claim}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const j = await res.json();
  cachedToken = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return cachedToken.token;
}

export function emailConfigured(): boolean {
  return !!(loadKey() && CLIENT_EMAIL);
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!to) return { ok: false, skipped: true, error: "ไม่มีอีเมลผู้รับ" };
  let token: string | null;
  try { token = await getToken(); }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
  if (!token) return { ok: false, skipped: true, error: "ยังไม่ตั้งค่า Gmail API (GCS_CLIENT_EMAIL / GCS_PRIVATE_KEY)" };

  const encWord = (s: string) => "=?UTF-8?B?" + Buffer.from(s, "utf8").toString("base64") + "?=";
  const body64 = Buffer.from(html, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  const toClean = String(to).replace(/[\r\n]/g, "");   // กัน header injection
  const mime = [
    `From: ${FROM}`, `To: ${toClean}`, `Subject: ${encWord(subject)}`,
    "MIME-Version: 1.0", "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", body64,
  ].join("\r\n");
  const raw = b64url(Buffer.from(mime));

  try {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `Gmail ${res.status}: ${(await res.text()).slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// เทมเพลตอีเมลเชิญ
export function inviteEmailHtml(email: string, dashUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#F8FAFC;font-family:'Segoe UI',Tahoma,sans-serif;color:#0F172A">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:32px 28px">
      <div style="font-size:20px;font-weight:800;margin-bottom:6px">คุณได้รับสิทธิ์เข้าใช้ CarFinn Dashboard 🎉</div>
      <div style="font-size:14px;color:#475569;line-height:1.7;margin-bottom:22px">
        บัญชี <b>${email}</b> ถูกเพิ่มเข้าระบบแล้ว เข้าใช้งานได้ทันทีด้วยบัญชี Google ของบริษัท
      </div>
      <a href="${dashUrl}" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px">เข้าสู่ระบบ →</a>
      <div style="font-size:12.5px;color:#94A3B8;margin-top:22px;line-height:1.7">
        กด &quot;Sign in with Google&quot; แล้วเลือกอีเมล ${email}<br>
        (ต้องเป็นอีเมล @carfinn.com เท่านั้น) · หากไม่ได้ร้องขอสิทธิ์นี้ ละเว้นอีเมลฉบับนี้ได้
      </div>
    </div>
    <div style="text-align:center;font-size:11.5px;color:#CBD5E1;margin-top:16px">CarFinn · Finance Operations Platform</div>
  </div></body></html>`;
}
