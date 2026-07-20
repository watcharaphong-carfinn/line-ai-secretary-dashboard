"use client";
import { useState, useEffect, useCallback } from "react";
import Topbar from "@/components/Topbar";
import {
  RefreshCw, CheckCircle, AlertCircle, Clock, MessageSquare, Database, Zap, Bot,
  FileSpreadsheet, ExternalLink, Megaphone,
} from "lucide-react";

interface SyncedFile {
  id: string; name: string | null; mimeType?: string | null;
  modifiedTime?: string | null; link: string; kind: "sales" | "lead"; error?: string;
}
interface Stats {
  lastSync: string | null;
  ai?: { provider: string; model: string };
  counts?: { daily: number; monthly: number; deals: number; leads: number; targets: number };
  syncedFiles?: SyncedFile[];
}

// คำสั่งที่บอทรองรับจริง (อัปเดตตามที่พัฒนาไว้)
const COMMAND_GROUPS: { group: string; items: { trigger: string; desc: string }[] }[] = [
  {
    group: "ยอดขาย · งานส่วนกลาง",
    items: [
      { trigger: "ยอดปิดวันนี้", desc: "ยอดปิดรายวัน พร้อมแยกธนาคาร" },
      { trigger: "ยอดปิดเดือนก่อน", desc: "รองรับ เดือนนี้/เดือนก่อน/ปีกลาย/3 เดือนที่แล้ว" },
      { trigger: "ยอด 3 เดือนล่าสุด", desc: "รวมช่วง — ย้อนหลัง N เดือน / สะสมต้นปี / ครึ่งปีแรก" },
      { trigger: "ไตรมาสที่แล้ว", desc: "สรุปรายไตรมาส" },
      { trigger: "เปรียบเทียบ 2568 กับ 2569", desc: "เทียบปี/เดือน/ประเภทงาน/เซลล์" },
    ],
  },
  {
    group: "วิเคราะห์ · จัดอันดับ",
    items: [
      { trigger: "เซลล์ไหนเก่งสุด", desc: "อันดับเซลล์ · ธนาคาร · เดือน · ปี · ประเภทงาน" },
      { trigger: "ธนาคารเดิมไหนปิดเยอะสุด", desc: "อันดับสถาบันการเงินเดิมที่ไปปิด" },
      { trigger: "ยอดโตขึ้นไหม", desc: "แนวโน้ม MoM + เทียบปีก่อน (YoY)" },
      { trigger: "ยอดเซลล์กรธิดา", desc: "สรุปรายเซลล์ / รายประเภทงาน" },
    ],
  },
  {
    group: "การตลาด · Lead",
    items: [
      { trigger: "การตลาดเดือนนี้", desc: "funnel ทักแชท→lead→ส่งงาน + งบโฆษณา/ROAS" },
      { trigger: "เดือนไหนยิงแอดคุ้มสุด", desc: "จัดอันดับกำไรจากโฆษณา" },
      { trigger: "ส่งไฟแนนซ์เจ้าไหนเยอะสุด", desc: "แยกตามลีสซิ่ง + อัตราอนุมัติ" },
      { trigger: "มีงานรอผลกี่เคส", desc: "สถานะงานที่ส่ง" },
    ],
  },
  {
    group: "เป้า KPI",
    items: [
      { trigger: "เป้าเดือนนี้", desc: "ดูความคืบหน้าเทียบเป้า" },
      { trigger: "ตั้งเป้า จากนี้ไป 40 ล้าน", desc: "admin — ตั้งเป้าต่อเนื่อง หรือระบุเดือน" },
    ],
  },
  {
    group: "ระบบ (admin)",
    items: [
      { trigger: "force sync", desc: "ดึงข้อมูลใหม่ทุกไฟล์" },
      { trigger: "cache status", desc: "สถานะข้อมูลในระบบ" },
      { trigger: "แจ้งเตือน สรุปยอด ทุกวัน 09:00", desc: "ส่งสรุปยอดอัตโนมัติเข้าไลน์" },
    ],
  },
];

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16,
      padding: "22px 24px", boxShadow: "0 1px 3px rgba(15,23,42,.04)", ...style,
    }}>{children}</div>
  );
}

function relTime(iso: string | null): string {
  if (!iso) return "ยังไม่เคย sync";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}

export default function BotPage() {
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/stats")
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j && !j.error) setStats(j); })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSync(force: boolean) {
    setSyncing(true); setMsg(null);
    try {
      const r = await fetch("/api/bot/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `error ${r.status}`);
      setMsg({ kind: "ok", text: `สั่ง ${force ? "force sync" : "sync"} แล้ว — บอทกำลังทำงาน (ใช้เวลา ~40-90 วินาที) กดรีเฟรชดูผลได้` });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally { setSyncing(false); }
  }

  const c = stats?.counts;
  const files = stats?.syncedFiles || [];

  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "Bot Management"]} title="Bot Management · ระบบ LINE Bot" />
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

        {msg && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "10px 14px", borderRadius: 10,
            background: msg.kind === "ok" ? "#F0FDF4" : "#FFFBEB",
            border: `1px solid ${msg.kind === "ok" ? "#BBF7D0" : "#FDE68A"}`,
            color: msg.kind === "ok" ? "#166534" : "#B45309",
          }}>
            {msg.kind === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {msg.text}
          </div>
        )}

        {/* Status row — ข้อมูลจริงจากบอท */}
        <div className="grid-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
          {[
            { icon: <Zap size={18} color="#2563EB" />, label: "Bot Status", value: stats ? "Online" : (loading ? "…" : "ไม่ตอบสนอง"), sub: "Cloud Run · min-instances 1" },
            { icon: <Database size={18} color="#10B981" />, label: "ข้อมูลยอดขาย", value: c ? `${c.daily} วัน` : "…", sub: c ? `${c.monthly} เดือน · ${c.deals.toLocaleString()} เคส` : "" },
            { icon: <Megaphone size={18} color="#D97706" />, label: "ข้อมูลการตลาด", value: c ? `${c.leads} เคส` : "…", sub: c ? `เป้า KPI ${c.targets} เดือน` : "" },
            { icon: <Clock size={18} color="#8B5CF6" />, label: "Sync ล่าสุด", value: relTime(stats?.lastSync ?? null), sub: stats?.lastSync ? new Date(stats.lastSync).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "" },
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

        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Sync control — ปุ่มจริง */}
            <Card>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Sync Control · ควบคุมการซิงค์</div>
              <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 16 }}>สั่งบอทดึงข้อมูลจาก Google Drive ทันที</div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => handleSync(false)} disabled={syncing} style={{
                  flex: 1, minWidth: 150, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: syncing ? "#93C5FD" : "#2563EB", color: "#fff",
                  border: "none", borderRadius: 11, padding: "12px 20px", fontSize: 14, fontWeight: 700,
                  cursor: syncing ? "default" : "pointer",
                }}>
                  <RefreshCw size={16} className={syncing ? "spin" : ""} />
                  {syncing ? "กำลังสั่ง…" : "Sync ทันที"}
                </button>
                <button onClick={() => handleSync(true)} disabled={syncing} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: "#fff", color: "#7C3AED", border: "1px solid #DDD6FE",
                  borderRadius: 11, padding: "12px 18px", fontSize: 13.5, fontWeight: 700,
                  cursor: syncing ? "default" : "pointer",
                }}>
                  Force sync
                </button>
              </div>

              <div style={{ marginTop: 16, padding: "12px 14px", background: "#F8FAFC", borderRadius: 11, fontSize: 12.5, color: "#64748B" }}>
                <div style={{ fontWeight: 600, color: "#475569", marginBottom: 6 }}>หมายเหตุ</div>
                <div>• Sync ทันที = อ่านเฉพาะไฟล์ที่เปลี่ยน · Force sync = อ่านใหม่ทุกไฟล์</div>
                <div style={{ marginTop: 3 }}>• ใช้เวลา ~40-90 วินาที · ทำงานเบื้องหลัง กดแล้วรอสักครู่ค่อยรีเฟรช</div>
                <div style={{ marginTop: 3 }}>• บอทยัง sync อัตโนมัติทุกวันตามเวลาที่ตั้งไว้</div>
              </div>
            </Card>

            {/* ไฟล์ที่ sync — ของจริง พร้อมลิงก์ */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>ไฟล์ที่ระบบดึงข้อมูล</div>
                <button onClick={load} style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "5px 9px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748B" }}>
                  <RefreshCw size={13} /> รีเฟรช
                </button>
              </div>
              <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 16 }}>คลิกเพื่อเปิดไฟล์ต้นทางใน Google Drive</div>

              {loading ? (
                <div style={{ fontSize: 12.5, color: "#94A3B8" }}>กำลังโหลด…</div>
              ) : !files.length ? (
                <div style={{ fontSize: 12.5, color: "#94A3B8" }}>ยังไม่มีไฟล์ที่ตั้งค่าไว้ (SYNC_FILE_IDS / LEAD_FILE_IDS)</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {files.map(f => (
                    <a key={f.id} href={f.link} target="_blank" rel="noopener noreferrer"
                       style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", background: "#F8FAFC",
                                borderRadius: 10, textDecoration: "none", color: "inherit", border: "1px solid transparent" }}>
                      <FileSpreadsheet size={17} color={f.kind === "lead" ? "#D97706" : "#10B981"} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.name || f.id}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2 }}>
                          {f.kind === "lead" ? "การตลาด/Lead" : "ยอดขาย"}
                          {f.modifiedTime && ` · แก้ไขล่าสุด ${new Date(f.modifiedTime).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}`}
                          {f.error && ` · ⚠️ ${f.error}`}
                        </div>
                      </div>
                      <ExternalLink size={14} color="#94A3B8" />
                    </a>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* คำสั่งที่บอทรองรับ */}
          <Card>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>คำสั่ง LINE Bot</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 18 }}>
              พิมพ์ในไลน์ได้เลย · AI เข้าใจภาษาธรรมชาติ ไม่ต้องพิมพ์ตรงเป๊ะ
              {stats?.ai && ` · ${stats.ai.model}`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {COMMAND_GROUPS.map(g => (
                <div key={g.group}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    {g.group}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {g.items.map(t => (
                      <div key={t.trigger} style={{ border: "1px solid #E2E8F0", borderRadius: 11, padding: "11px 13px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <MessageSquare size={14} color="#2563EB" />
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{t.trigger}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: "#64748B" }}>{t.desc}</div>
                      </div>
                    ))}
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
