"use client";
import Topbar from "@/components/Topbar";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const monthlyTrend = [
  { month: "ม.ค.", close: 280, approved: 348, cases: 210 },
  { month: "ก.พ.", close: 260, approved: 318, cases: 192 },
  { month: "มี.ค.", close: 318, approved: 395, cases: 238 },
  { month: "เม.ย.", close: 295, approved: 362, cases: 220 },
  { month: "พ.ค.", close: 342, approved: 421, cases: 256 },
  { month: "มิ.ย.", close: 313, approved: 387, cases: 234 },
];

const productMix = [
  { name: "รถใหม่", value: 44 },
  { name: "รถมือสอง", value: 31 },
  { name: "รีไฟแนนซ์", value: 18 },
  { name: "จำนำทะเบียน", value: 7 },
];
const PIE_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6"];

const conversionFunnel = [
  { stage: "Lead เข้า", count: 1820 },
  { stage: "ยื่นเอกสาร", count: 1240 },
  { stage: "ส่งธนาคาร", count: 840 },
  { stage: "ขอข้อมูลเพิ่ม", count: 520 },
  { stage: "อนุมัติ", count: 428 },
  { stage: "ปิดสัญญา", count: 382 },
];

const agentPerf = [
  { name: "ทีม A", close: 68, target: 60 },
  { name: "ทีม B", close: 54, target: 60 },
  { name: "ทีม C", close: 72, target: 70 },
  { name: "ทีม D", close: 61, target: 65 },
  { name: "ทีม E", close: 48, target: 55 },
];

function StatBadge({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, margin: "8px 0 4px" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#94A3B8" }}>{sub}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "Analytics"]} title="Analytics · วิเคราะห์ประสิทธิภาพ" />
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Summary */}
        <div className="grid-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
          <StatBadge label="Approval Rate" value="82.4%" sub="เดือนมิถุนายน" color="#2563EB" />
          <StatBadge label="Avg Loan Size" value="฿1.65M" sub="สินเชื่อเฉลี่ย" color="#059669" />
          <StatBadge label="Avg Close Days" value="4.2 วัน" sub="เวลาปิดเฉลี่ย" color="#D97706" />
          <StatBadge label="Total Cases" value="234" sub="เคสเดือนนี้" color="#7C3AED" />
        </div>

        {/* Monthly Area + Funnel */}
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24 }}>
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Monthly Volume Trend</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 20 }}>ยอดปิด/อนุมัติ และจำนวนเคสรายเดือน (฿M)</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Area type="monotone" dataKey="close" name="ยอดปิด" stroke="#2563EB" strokeWidth={2.5} fill="url(#gc)" />
                <Area type="monotone" dataKey="approved" name="ยอดอนุมัติ" stroke="#10B981" strokeWidth={2.5} fill="url(#ga)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Funnel */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Conversion Funnel</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 20 }}>pipeline เดือนนี้</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {conversionFunnel.map((s, i) => {
                const pct = Math.round((s.count / conversionFunnel[0].count) * 100);
                const opacity = 1 - i * 0.12;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{s.stage}</span>
                      <span style={{ color: "#64748B" }}>{s.count.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div style={{ height: 9, borderRadius: 999, background: "#F1F5F9", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `rgba(37,99,235,${opacity})` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Product mix + Agent performance */}
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 24 }}>
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Product Mix</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 16 }}>สัดส่วนประเภทสินเชื่อ</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={productMix} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {productMix.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {productMix.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i], flexShrink: 0 }} />
                    <span style={{ color: "#475569" }}>{p.name}</span>
                    <span style={{ fontWeight: 700, marginLeft: "auto" }}>{p.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Team Performance vs Target</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 18 }}>ยอดปิดเทียบเป้าแยกทีม (เคส)</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agentPerf} barCategoryGap="35%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="close" name="ยอดปิด" fill="#2563EB" radius={[5, 5, 0, 0]} />
                <Bar dataKey="target" name="เป้าหมาย" fill="#E2E8F0" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </>
  );
}
