import Link from "next/link";

const ERRORS: Record<string, string> = {
  denied: "อีเมลนี้ไม่มีสิทธิ์เข้าระบบ — ติดต่อ Super Admin ให้เพิ่มสิทธิ์",
  state: "เซสชันหมดอายุ กรุณาลองเข้าสู่ระบบใหม่",
  email: "อีเมลไม่ผ่านการยืนยัน",
  token: "เชื่อมต่อ Google ไม่สำเร็จ",
  idtoken: "รับข้อมูลจาก Google ไม่สำเร็จ",
  server: "เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const errMsg = error ? (ERRORS[error] || "เข้าสู่ระบบไม่สำเร็จ") : null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F172A", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 18, padding: "40px 36px", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
        {/* logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/carfinn-mark.png" alt="CarFinn AI" style={{ width: 48, height: 48, borderRadius: 12, display: "block" }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.01em", color: "#0F172A" }}>CarFinn AI</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>Finance Operations Platform</div>
          </div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>เข้าสู่ระบบ</div>
        <div style={{ fontSize: 13.5, color: "#64748B", marginBottom: 26 }}>เฉพาะผู้ใช้ที่ได้รับอนุญาต (Carfinn) เท่านั้น</div>

        {errMsg && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "11px 14px", fontSize: 13, color: "#DC2626", marginBottom: 18 }}>
            ⚠️ {errMsg}
          </div>
        )}

        <a href="/api/auth/login" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 11,
          width: "100%", padding: "13px", borderRadius: 11, textDecoration: "none",
          border: "1px solid #E2E8F0", background: "#fff", color: "#1F2937",
          fontSize: 15, fontWeight: 600, boxShadow: "0 1px 2px rgba(0,0,0,.05)",
        }}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          เข้าสู่ระบบด้วย Google
        </a>

        <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 20, textAlign: "center" }}>
          มีปัญหาเข้าระบบ? ติดต่อผู้ดูแลระบบ Carfinn
        </div>
      </div>
    </div>
  );
}
