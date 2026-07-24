"use client";
import {
  Database, Bot, LayoutGrid, ShieldCheck, FileSpreadsheet, MessageCircle,
  Radio, CheckCircle2, Clock, ArrowRight,
} from "lucide-react";

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

const chip = (bg: string, color: string): React.CSSProperties => ({
  fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, background: bg, color,
});

// ── แหล่งข้อมูล ──
const SOURCES = [
  {
    tag: "งานส่วนกลาง", tagBg: "#DCFCE7", tagColor: "#166534",
    name: "ยอดขาย (ทีมขาย)", icon: <FileSpreadsheet size={16} color="#10B981" />,
    src: "Google Sheets · 3 ไฟล์ (ปี 2567 / 2568 / 2569)",
    gives: "ยอดปิด · ยอดอนุมัติ · รายได้ · แยกธนาคาร + รายเคส (เซลล์ / ประเภทงาน / ธนาคารเดิม)",
    status: "ใช้งาน", ok: true,
  },
  {
    tag: "งานภายใน", tagBg: "#FEF3C7", tagColor: "#92400E",
    name: "การตลาด / Lead", icon: <FileSpreadsheet size={16} color="#D97706" />,
    src: 'ไฟล์ .xlsx "รายชื่อส่งงาน (ภายใน)"',
    gives: "funnel (ทักแชท → lead → ส่งงาน) · งบโฆษณา · ส่งไฟแนนซ์รายเจ้า · lead รายเคส",
    status: "ใช้งาน", ok: true,
  },
  {
    tag: "โฆษณา", tagBg: "#DBEAFE", tagColor: "#1E40AF",
    name: "LINE OA", icon: <MessageCircle size={16} color="#2563EB" />,
    src: "LINE Messaging API + Webhook",
    gives: "ผู้ติดตาม / บล็อก รายวัน · เวลาที่ลูกค้าทักครั้งแรก",
    status: "ใช้งาน", ok: true,
  },
  {
    tag: "โฆษณา", tagBg: "#DBEAFE", tagColor: "#1E40AF",
    name: "TikTok", icon: <Radio size={16} color="#7C3AED" />,
    src: "TikTok Business API",
    gives: "งบโฆษณา · impressions · clicks (เมื่อเชื่อมต่อ)",
    status: "รออนุมัติ app", ok: false,
  },
  {
    tag: "โฆษณา", tagBg: "#DBEAFE", tagColor: "#1E40AF",
    name: "Facebook / IG", icon: <Radio size={16} color="#0EA5E9" />,
    src: "Meta Marketing API",
    gives: "งบโฆษณา · ทักแชท · lead (เมื่อเชื่อมต่อ)",
    status: "รอรวม Business Manager", ok: false,
  },
];

// ── ที่เก็บข้อมูล (Firestore) ──
const COLLECTIONS = [
  { name: "botcache/store", desc: "ยอดปิดรายวัน/รายเดือน (งานส่วนกลาง)", pii: false },
  { name: "deals/<ปี-เดือน>", desc: "รายเคสยอดขาย (มีชื่อ/เบอร์ลูกค้า)", pii: true },
  { name: "dealagg/agg", desc: "สรุปยอดขาย (ไม่มี PII — AI ใช้ตัวนี้)", pii: false },
  { name: "config/targets", desc: "เป้า KPI รายเดือน", pii: false },
  { name: "marketing/summary", desc: "funnel การตลาด (ไม่มี PII)", pii: false },
  { name: "leads/<ปี-เดือน>", desc: "lead รายเคส (มีชื่อ/เบอร์)", pii: true },
  { name: "adsources", desc: "บัญชีโฆษณา + token (ลับ)", pii: true },
  { name: "adstats / inbound_stats", desc: "สถิติ LINE (followers · เวลาทัก)", pii: false },
  { name: "users / audit", desc: "สิทธิ์ผู้ใช้ · บันทึกการใช้งาน", pii: false },
];

// ── เมนูไหนดูข้อมูลชุดไหน ──
const MENU_MAP = [
  { menu: "ภาพรวมระบบ", data: "สรุปยอดขายงานส่วนกลาง", tag: "งานส่วนกลาง" },
  { menu: "ลูกค้า · ยอดปิด", data: "รายเคสลูกค้า (งานส่วนกลาง)", tag: "งานส่วนกลาง" },
  { menu: "การตลาด · Lead", data: "funnel + lead (งานภายใน)", tag: "งานภายใน" },
  { menu: "รายงานโฆษณา / บัญชีโฆษณา", data: "สถิติ LINE OA · เวลาทัก · ตั้งค่าบัญชี", tag: "โฆษณา" },
  { menu: "Bot Management", data: "สั่ง sync · ไฟล์ต้นทาง · คำสั่งบอท", tag: "ระบบ" },
];

export default function SystemPage() {
  return (
    <>
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: -4 }}>
          ภาพรวมว่าข้อมูลมาจากไหน เก็บที่ไหน และไหลไปแสดงผลอย่างไร
        </div>

        {/* Flow */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 12, flexWrap: "wrap" }}>
            {[
              { icon: <FileSpreadsheet size={22} color="#10B981" />, t: "แหล่งข้อมูล", s: "Sheets · xlsx · LINE/TikTok API" },
              { icon: <Bot size={22} color="#2563EB" />, t: "บอท (ประมวลผล)", s: "sync + คำนวณ + webhook" },
              { icon: <Database size={22} color="#7C3AED" />, t: "Firestore", s: "ที่เก็บถาวร" },
              { icon: <LayoutGrid size={22} color="#D97706" />, t: "แสดงผล", s: "แดชบอร์ด + บอทตอบใน LINE" },
            ].map((b, i, arr) => (
              <div key={b.t} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "center", minWidth: 120 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>{b.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{b.t}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{b.s}</div>
                </div>
                {i < arr.length - 1 && <ArrowRight size={18} color="#CBD5E1" className="desktop-only" />}
              </div>
            ))}
          </div>
        </div>

        {/* แหล่งข้อมูล */}
        <Panel title="แหล่งข้อมูล" icon={<FileSpreadsheet size={17} color="#10B981" />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SOURCES.map(s => (
              <div key={s.name} style={{ border: "1px solid #E2E8F0", borderRadius: 11, padding: "13px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6, flexWrap: "wrap" }}>
                  {s.icon}
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{s.name}</span>
                  <span style={chip(s.tagBg, s.tagColor)}>{s.tag}</span>
                  <span style={{ ...chip(s.ok ? "#F0FDF4" : "#FFF7ED", s.ok ? "#166534" : "#B45309"), marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {s.ok ? <CheckCircle2 size={11} /> : <Clock size={11} />} {s.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#64748B" }}>ต้นทาง: {s.src}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>ได้ข้อมูล: {s.gives}</div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Firestore */}
          <Panel title="ที่เก็บข้อมูล · Firestore" icon={<Database size={17} color="#7C3AED" />}>
            <div style={{ fontSize: 11.5, color: "#94A3B8", marginBottom: 12 }}>project: key-phoenix-492007-b2</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {COLLECTIONS.map(c => (
                <div key={c.name} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <code style={{ fontSize: 11.5, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap", flexShrink: 0 }}>{c.name}</code>
                  <div style={{ fontSize: 12, color: "#475569", flex: 1 }}>{c.desc}</div>
                  {c.pii && <span style={chip("#FEE2E2", "#B91C1C")}>PII</span>}
                </div>
              ))}
            </div>
          </Panel>

          {/* บริการ + ความปลอดภัย */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Panel title="บริการ" icon={<Bot size={17} color="#2563EB" />}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>บอท LINE (น้องเลขา)</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
                    Node.js + Express + Gemini · Cloud Run (asia-southeast3) · เปิดตลอด (min-instances 1)<br />
                    ตอบแชท · sync ข้อมูลทุกวัน · รับ webhook เวลาทัก
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>แดชบอร์ด (หน้านี้)</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
                    Next.js 16 · Cloud Run (scale-to-zero) · Google OAuth
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="ความปลอดภัย" icon={<ShieldCheck size={17} color="#059669" />}>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#475569", lineHeight: 1.8 }}>
                <li>ข้อมูลลูกค้า (ชื่อ/เบอร์) เก็บแยก access-control · <b>ไม่ส่งให้ AI</b> (ส่งแต่ตัวเลขรวม)</li>
                <li>ทุกหน้า/ทุก API ต้อง login · token โฆษณาเก็บลับ ไม่โชว์ในหน้าเว็บ</li>
                <li>เพิ่ม/ลบผู้ใช้ · ตั้งค่าบัญชีโฆษณา = เฉพาะ super admin + บันทึก audit log</li>
              </ul>
            </Panel>
          </div>
        </div>

        {/* เมนูไหนดูอะไร */}
        <Panel title="เมนูไหนดูข้อมูลชุดไหน" icon={<LayoutGrid size={17} color="#D97706" />}>
          <div style={{ overflowX: "auto" }}>
            <table className="dtable" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 520 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#64748B" }}>
                  {["เมนู", "แสดงข้อมูล", "ประเภทงาน"].map(h => (
                    <th key={h} style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #E2E8F0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MENU_MAP.map(m => (
                  <tr key={m.menu}>
                    <td style={{ padding: "9px 10px", fontWeight: 600 }}>{m.menu}</td>
                    <td style={{ padding: "9px 10px", color: "#475569" }}>{m.data}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <span style={chip(
                        m.tag === "งานส่วนกลาง" ? "#DCFCE7" : m.tag === "งานภายใน" ? "#FEF3C7" : m.tag === "โฆษณา" ? "#DBEAFE" : "#F1F5F9",
                        m.tag === "งานส่วนกลาง" ? "#166534" : m.tag === "งานภายใน" ? "#92400E" : m.tag === "โฆษณา" ? "#1E40AF" : "#475569",
                      )}>{m.tag}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

      </div>
    </>
  );
}
