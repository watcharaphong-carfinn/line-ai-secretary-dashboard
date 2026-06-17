"use client";
import { useState } from "react";
import Topbar from "@/components/Topbar";
import { Save, Eye, EyeOff, CheckCircle } from "lucide-react";

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid #F1F5F9" }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>{sub}</div>}
      </div>
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, value, type = "text", hint, readOnly = false }: {
  label: string; value: string; type?: string; hint?: string; readOnly?: boolean;
}) {
  const [v, setV] = useState(value);
  const [show, setShow] = useState(false);
  const isSecret = type === "password";

  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={isSecret && !show ? "password" : "text"}
          value={v}
          onChange={e => !readOnly && setV(e.target.value)}
          readOnly={readOnly}
          style={{
            width: "100%", border: "1px solid #E2E8F0", borderRadius: 9, padding: "10px 14px",
            fontSize: 13.5, color: readOnly ? "#94A3B8" : "#0F172A", background: readOnly ? "#F8FAFC" : "#fff",
            outline: "none", boxSizing: "border-box", paddingRight: isSecret ? 42 : 14,
          }}
        />
        {isSecret && (
          <button
            onClick={() => setShow(s => !s)}
            style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", padding: 4,
            }}
          >
            {show ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
          </button>
        )}
      </div>
      {hint && <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Toggle({ label, sub, on }: { label: string; sub?: string; on: boolean }) {
  const [active, setActive] = useState(on);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#374151" }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        onClick={() => setActive(a => !a)}
        style={{
          width: 46, height: 26, borderRadius: 999, border: "none", cursor: "pointer",
          background: active ? "#2563EB" : "#D1D5DB", position: "relative", transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <span style={{
          position: "absolute", top: 3, left: active ? "calc(100% - 22px)" : 3,
          width: 20, height: 20, borderRadius: "50%", background: "#fff",
          transition: "left 0.2s", display: "block",
        }} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "Settings"]} title="Settings · ตั้งค่าระบบ" />
      <div style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

        <Section title="LINE Bot Configuration" sub="ตั้งค่า LINE Messaging API">
          <Field label="LINE Channel Access Token" value="••••••••••••••••••••••••••••••••" type="password" hint="จัดการใน Google Secret Manager (LINE_CHANNEL_ACCESS_TOKEN)" />
          <Field label="LINE Channel Secret" value="••••••••••••••••••••••" type="password" hint="จัดการใน Google Secret Manager (LINE_CHANNEL_SECRET)" />
          <Field label="Webhook URL" value="https://line-ai-secretary-xxx-as.a.run.app/webhook" readOnly hint="URL นี้ต้องตั้งใน LINE Developer Console" />
        </Section>

        <Section title="Google Integration" sub="Google Drive, Sheets, Gemini">
          <Field label="Gemini API Key" value="••••••••••••••••••••••••••••••••" type="password" hint="จัดการใน Google Secret Manager (GEMINI_API_KEY)" />
          <Field label="Bot Cache Sheet ID" value="••••••••••••••••••••••••••••" type="password" hint="จัดการใน Google Secret Manager (BOT_CACHE_SHEET_ID)" />
          <Field label="Drive Folder IDs" value="••••••••••••••,••••••••••••••" type="password" hint="จัดการใน Google Secret Manager (DRIVE_FOLDER_IDS)" />
          <Field label="Sync File Keywords" value="งานส่วนกลาง" hint="จัดการใน Google Secret Manager (SYNC_FILE_KEYWORDS) — คั่นด้วยคอมมา" />
        </Section>

        <Section title="Sync Settings" sub="ตั้งค่าการซิงค์ข้อมูล">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Download Timeout (วิ)" value="120" hint="timeout ต่อไฟล์ (วินาที)" />
            <Field label="Batch Size" value="2" hint="จำนวนไฟล์ต่อ batch" />
            <Field label="Batch Delay (ms)" value="1500" hint="หน่วง ms ระหว่าง batch" />
            <Field label="Min Instances (Cloud Run)" value="1" hint="keep warm ตลอดเวลา" />
          </div>
        </Section>

        <Section title="Notification Settings" sub="ตั้งค่าการแจ้งเตือน">
          <Toggle label="แจ้งเมื่อ Sync เสร็จสิ้น" sub="ส่งข้อความยืนยันใน LINE group" on={true} />
          <Toggle label="แจ้งเมื่อ Sync ล้มเหลว" sub="ส่ง error message ให้ admin" on={true} />
          <Toggle label="แจ้งยอดปิดทุกเย็น (18:00)" sub="Auto-report รายวัน" on={false} />
          <Toggle label="แจ้งยอดสิ้นเดือน" sub="ส่งสรุปยอดวันสุดท้ายของเดือน" on={true} />
        </Section>

        {/* Save */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {saved && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, color: "#059669" }}>
              <CheckCircle size={17} /> บันทึกเรียบร้อยแล้ว
            </div>
          )}
          <button
            onClick={handleSave}
            style={{
              display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700,
              background: "#2563EB", color: "#fff", border: "none",
              borderRadius: 11, padding: "11px 24px", cursor: "pointer",
            }}
          >
            <Save size={16} /> บันทึกการตั้งค่า
          </button>
        </div>

      </div>
    </>
  );
}
