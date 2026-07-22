import { getSessionUser } from "@/lib/auth";
import { sendEmail, emailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";

// ทดสอบส่งอีเมล — super_admin ส่งเมลทดสอบไปที่อีเมลตัวเอง
export async function POST() {
  const u = await getSessionUser();
  if (!u || u.role !== "super_admin") return Response.json({ error: "forbidden" }, { status: 403 });
  if (!emailConfigured()) return Response.json({ ok: false, configured: false, error: "ยังไม่ตั้งค่า Gmail API (GCS_CLIENT_EMAIL / GCS_PRIVATE_KEY)" });

  const res = await sendEmail(u.email, "ทดสอบอีเมล · CarFinn Dashboard",
    `<div style="font-family:sans-serif;padding:20px"><b>ทดสอบส่งอีเมลสำเร็จ ✅</b><br>ระบบส่งอีเมลของ CarFinn Dashboard ทำงานปกติ (${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })})</div>`);
  return Response.json({ ...res, to: u.email });
}

export async function GET() {
  const u = await getSessionUser();
  if (!u || u.role !== "super_admin") return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json({ configured: emailConfigured() });
}
