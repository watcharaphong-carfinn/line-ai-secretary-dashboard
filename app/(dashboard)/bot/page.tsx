"use client";
import { useState, useEffect } from "react";
import Topbar from "@/components/Topbar";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, MessageSquare, Database, Zap, Bot } from "lucide-react";

const SYNC_HISTORY = [
  { ts: "16 มิ.ย. 69 · 14:40", duration: "38.2 วิ", records: 245, status: "success", note: "งานส่วนกลาง ปี 2569" },
  { ts: "16 มิ.ย. 69 · 11:00", duration: "41.8 วิ", records: 245, status: "success", note: "งานส่วนกลาง ปี 2568" },
  { ts: "15 มิ.ย. 69 · 20:50", duration: "665.9 วิ", records: 245, status: "warning", note: "ปี 2568/2569 timeout" },
  { ts: "14 มิ.ย. 69 · 08:00", duration: "471.5 วิ", records: 0, status: "error", note: "0 records — Bot Cache filtered" },
];

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle size={16} color="#10B981" />,
  warning: <AlertCircle size={16} color="#F59E0B" />,
  error:   <XCircle size={16} color="#EF4444" />,
};

const KEYWORDS = ["งานส่วนกลาง"];

const RESPONSE_TEMPLATES = [
  { name: "ยอดปิดวันนี้", trigger: "ยอดปิดวันนี้", desc: "แสดงยอดปิดสินเชื่อรายวัน พร้อมแยกธนาคาร" },
  { name: "ยอดปิดเดือนที่แล้ว", trigger: "ยอดปิดเดือนที่แล้ว", desc: "แสดงยอดปิดสินเชื่อเดือนที่แล้ว" },
  { name: "ยอดปิดรายเดือน", trigger: "ยอดปิดรายเดือน", desc: "แสดงยอดปิดสินเชื่อทุกเดือน" },
  { name: "ยอดปิดทั้งหมด", trigger: "ยอดปิดทั้งหมด", desc: "สรุปยอดสินเชื่อทั้งหมด" },
  { name: "sync ข้อมูล", trigger: "sync ข้อมูล", desc: "สั่ง sync ข้อมูลจาก Google Drive" },
];

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16,
      padding: "22px 24px", boxShadow: "0 1px 3px rgba(15,23,42,.04)", ...style,
    }}>{children}</div>
  );
}

export default function BotPage() {
  const [syncing, setSyncing] = useState(false);
  const [ai, setAi] = useState<{ provider: string; model: string } | null>(null);

  // ดึงข้อมูล AI/model จริงจากบอท (/api/stats)
  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.ai) setAi(j.ai); })
      .catch(() => {});
  }, []);

  function handleSync() {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 3000);
  }

  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "Bot Management"]} title="Bot Management · ระบบ LINE Bot" />
      <div style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Status row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
          {[
            { icon: <Zap size={18} color="#2563EB" />, label: "Bot Status", value: "Online", sub: "Cloud Run · min-instances 1", ok: true },
            { icon: <Database size={18} color="#10B981" />, label: "Bot Cache", value: "245 records", sub: "12 เดือน · ปี 2569", ok: true },
            { icon: <Clock size={18} color="#D97706" />, label: "Last Sync", value: "2 นาทีที่แล้ว", sub: "38.2 วินาที", ok: true },
            { icon: <Bot size={18} color="#8B5CF6" />, label: "AI Model", value: ai?.model ?? "…", sub: ai?.provider ?? "กำลังเชื่อมต่อ", ok: true },
          ].map((item, i) => (
            <Card key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{item.value}</div>
              <div style={{ fontSize: 12, color: "#94A3B8" }}>{item.sub}</div>
            </Card>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24 }}>
          {/* Sync control */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Sync Control · ควบคุมการซิงค์</div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>SYNC_FILE_KEYWORDS (Secret Manager)</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {KEYWORDS.map(k => (
                    <span key={k} style={{ background: "#EFF6FF", color: "#2563EB", fontSize: 12.5, fontWeight: 600, padding: "4px 11px", borderRadius: 999, border: "1px solid #BFDBFE" }}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: syncing ? "#93C5FD" : "#2563EB", color: "#fff",
                    border: "none", borderRadius: 11, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: syncing ? "default" : "pointer",
                  }}
                >
                  <RefreshCw size={16} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
                  {syncing ? "กำลัง Sync…" : "Sync ทันที"}
                </button>
              </div>

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

              <div style={{ marginTop: 18, padding: "12px 14px", background: "#F8FAFC", borderRadius: 11, fontSize: 12.5, color: "#64748B" }}>
                <div style={{ fontWeight: 600, color: "#475569", marginBottom: 6 }}>ข้อมูลการ Sync</div>
                <div>Batch: 2 ไฟล์ · delay 1.5s · timeout 120s/ไฟล์</div>
                <div style={{ marginTop: 3 }}>ไม่ sync Bot Cache Sheet (ข้อมูล)</div>
              </div>
            </Card>

            {/* Sync history */}
            <Card>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Sync History</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SYNC_HISTORY.map((h, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", background: "#F8FAFC", borderRadius: 10 }}>
                    <div style={{ paddingTop: 1 }}>{STATUS_ICON[h.status]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{h.ts}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{h.note}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: h.status === "error" ? "#DC2626" : "#0F172A" }}>{h.records} records</div>
                      <div style={{ fontSize: 11.5, color: "#94A3B8" }}>{h.duration}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Response templates */}
          <Card>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Response Templates · คำสั่ง LINE Bot</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 18 }}>คำสั่งที่ Bot รองรับในปัจจุบัน</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RESPONSE_TEMPLATES.map((t, i) => (
                <div key={i} style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <MessageSquare size={15} color="#2563EB" />
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{t.name}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#475569", marginBottom: 8 }}>{t.desc}</div>
                  <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "7px 11px", fontSize: 12, fontFamily: "monospace", color: "#475569" }}>
                    trigger: "{t.trigger}"
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </>
  );
}
