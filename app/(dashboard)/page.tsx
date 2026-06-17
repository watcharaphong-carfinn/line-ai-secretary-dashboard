"use client";
import Topbar from "@/components/Topbar";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, CheckCircle, AlertCircle, RefreshCw, Activity } from "lucide-react";

// ── Mock data ────────────────────────────────────────────────────────────────
const trendData = [
  { day: "9 มิ.ย.", close: 18.4, approved: 22.1 },
  { day: "10 มิ.ย.", close: 21.2, approved: 25.8 },
  { day: "11 มิ.ย.", close: 15.6, approved: 19.4 },
  { day: "12 มิ.ย.", close: 24.8, approved: 28.3 },
  { day: "13 มิ.ย.", close: 22.1, approved: 26.7 },
  { day: "14 มิ.ย.", close: 19.3, approved: 24.5 },
  { day: "15 มิ.ย.", close: 26.7, approved: 31.2 },
  { day: "16 มิ.ย.", close: 23.4, approved: 28.9 },
];

const yoyData = [
  { month: "ม.ค.", y2568: 42, y2569: 48 },
  { month: "ก.พ.", y2568: 38, y2569: 45 },
  { month: "มี.ค.", y2568: 51, y2569: 58 },
  { month: "เม.ย.", y2568: 44, y2569: 52 },
  { month: "พ.ค.", y2568: 56, y2569: 63 },
  { month: "มิ.ย.", y2568: 48, y2569: 55 },
];

const bankData = [
  { bank: "กสิกรไทย", amount: 186.4, cases: 142, rate: 86 },
  { bank: "ไทยพาณิชย์", amount: 164.8, cases: 128, rate: 82 },
  { bank: "กรุงไทย", amount: 148.2, cases: 115, rate: 79 },
  { bank: "กรุงเทพ", amount: 132.6, cases: 103, rate: 77 },
  { bank: "ทหารไทยธนชาต", amount: 118.9, cases: 94, rate: 75 },
];

const activities = [
  { time: "14:40", event: "ซิงค์ข้อมูลธนาคารเสร็จสิ้น", type: "success", user: "system" },
  { time: "14:32", event: "อนุมัติสินเชื่อ LN-24817 · ฿1.85M", type: "success", user: "นพดล" },
  { time: "14:18", event: "ลูกค้าใหม่ยื่นเอกสาร #8293", type: "info", user: "สาขากรุงเทพ" },
  { time: "13:55", event: "ปฏิเสธสินเชื่อ LN-24801 · เครดิตไม่ผ่าน", type: "danger", user: "ระบบ" },
  { time: "13:42", event: "อัพเดทข้อมูลธนาคารกสิกรไทย", type: "info", user: "admin" },
  { time: "13:30", event: "Export รายงานประจำเดือน", type: "info", user: "วรรณา" },
];

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, change, up }: {
  label: string; value: string; sub?: string; change: string; up: boolean;
}) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14,
      padding: "20px 22px", boxShadow: "0 1px 3px rgba(15,23,42,.04)",
    }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.05em", color: "#64748B", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, margin: "10px 0 4px", letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 4 }}>{sub}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: up ? "#059669" : "#DC2626" }}>
        {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {change}
      </div>
    </div>
  );
}

// ── Activity dot ──────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  success: "#10B981", info: "#06B6D4", danger: "#EF4444", warning: "#F59E0B",
};

export default function DashboardPage() {
  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก"]} title="Dashboard Overview · ภาพรวมระบบ" />
      <div style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── KPIs ──────────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
          <KpiCard label="ยอดปิดวันนี้" value="฿23.4M" change="+8.2% จากเมื่อวาน" up={true} />
          <KpiCard label="ยอดอนุมัติวันนี้" value="฿28.9M" change="+12.4% จากเมื่อวาน" up={true} />
          <KpiCard label="ยอดปิดเดือนนี้" value="฿312.6M" sub="วันทำการที่ 12" change="+6.8% จากเดือนที่แล้ว" up={true} />
          <KpiCard label="ยอดอนุมัติเดือนนี้" value="฿387.2M" sub="82.4% approval rate" change="-1.2% จากเดือนที่แล้ว" up={false} />
        </div>

        {/* ── Trend chart ───────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Performance Trend · แนวโน้มยอด</div>
              <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 2 }}>ยอดปิดและยอดอนุมัติ 8 วันล่าสุด (ล้านบาท)</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["7 วัน", "30 วัน", "90 วัน"].map((label, i) => (
                <button key={label} style={{
                  border: i === 0 ? "1px solid #2563EB" : "1px solid #E2E8F0",
                  background: i === 0 ? "#EFF6FF" : "#fff",
                  color: i === 0 ? "#2563EB" : "#64748B",
                  fontSize: 12.5, fontWeight: 600, padding: "7px 13px", borderRadius: 8, cursor: "pointer",
                }}>{label}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${v}M`} />
              <Tooltip formatter={(v) => [`฿${v}M`, ""]} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
              <Line type="monotone" dataKey="close" name="ยอดปิด" stroke="#2563EB" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="approved" name="ยอดอนุมัติ" stroke="#10B981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ── YoY + Bank ────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* YoY */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>เปรียบเทียบปี · YoY</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 20 }}>ยอดปิดรายเดือน ปี 2568 vs 2569 (฿M)</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={yoyData} barCategoryGap="30%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13 }} formatter={(v) => [`฿${v}M`, ""]} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="y2568" name="ปี 2568" fill="#CBD5E1" radius={[5, 5, 0, 0]} />
                <Bar dataKey="y2569" name="ปี 2569" fill="#2563EB" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bank performance */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Bank Performance</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 18 }}>ยอดอนุมัติแยกธนาคาร เดือนนี้</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {bankData.map((b, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{b.bank}</span>
                    <span style={{ color: "#64748B" }}>฿{b.amount}M · {b.cases} เคส · <span style={{ color: "#059669", fontWeight: 600 }}>{b.rate}%</span></span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "#F1F5F9", overflow: "hidden" }}>
                    <div style={{ width: `${(b.amount / 200) * 100}%`, height: "100%", background: "#2563EB", borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── System status + Activities ───────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 24 }}>
          {/* System status */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>System Status · สถานะระบบ</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "System Status", value: "Operational", ok: true },
                { label: "Uptime", value: "99.94%", ok: true },
                { label: "Last Sync", value: "2 นาทีที่แล้ว", ok: true },
                { label: "Avg Response", value: "186 ms", ok: true },
                { label: "Requests Today", value: "7,184", ok: true },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#F8FAFC", borderRadius: 10 }}>
                  <span style={{ fontSize: 13.5, color: "#475569" }}>{item.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    {item.ok
                      ? <CheckCircle size={15} color="#10B981" />
                      : <AlertCircle size={15} color="#F59E0B" />}
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: item.ok ? "#059669" : "#D97706" }}>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activities */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Recent Activities · กิจกรรมล่าสุด</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "#059669", background: "#ECFDF5", padding: "4px 10px", borderRadius: 999 }}>
                <Activity size={12} />Live
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {activities.map((a, i) => (
                <div key={i} style={{
                  display: "flex", gap: 14, padding: "12px 0",
                  borderBottom: i < activities.length - 1 ? "1px solid #F1F5F9" : "none",
                }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: TYPE_COLOR[a.type], flexShrink: 0 }} />
                    {i < activities.length - 1 && <div style={{ width: 1, flex: 1, background: "#F1F5F9", marginTop: 6 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{a.event}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{a.time} · {a.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
