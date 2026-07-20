"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { MessageCircle, Inbox, Send, Megaphone, Wallet, TrendingUp } from "lucide-react";
import Topbar from "@/components/Topbar";

// ห่อทุก state ด้วยโครงเดียวกับหน้าอื่น (Topbar + page-body) เพื่อให้มีขอบ/หัวข้อเหมือนกัน
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "การตลาด · Lead"]} title="การตลาดออนไลน์ · Lead" />
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
        {children}
      </div>
    </>
  );
}

// ── ชุดสีผ่าน validator (CVD ΔE ต่ำสุด 25.6 — แยกออกแม้ตาบอดสี) ──
const C_CHAT = "#2563EB";   // ทักแชท
const C_LEAD = "#D97706";   // รับ lead
const C_SEND = "#7C3AED";   // ส่งงาน
const C_COST = "#D97706";   // งบโฆษณา
const C_REV  = "#2563EB";   // รายได้

const TH = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const nf = (v: number) => Math.round(v || 0).toLocaleString("th-TH");
const bt = (v: number) => `฿${nf(v)}`;
const btShort = (v: number) =>
  Math.abs(v) >= 1_000_000 ? `฿${(v / 1_000_000).toFixed(1)}M`
  : Math.abs(v) >= 1_000 ? `฿${(v / 1_000).toFixed(0)}K` : `฿${nf(v)}`;

interface FunnelRow {
  yearBE: number; month: number;
  chats: number; leads: number; submitted: number;
  pending: number; approved: number; rejected: number;
  adCost: number; revenue: number; profit: number;
  roas: number | null; leadRate: number | null; submitRate: number | null; costPerLead: number | null;
}
interface Bucket { count: number; approved: number; rejected: number; pending: number }
interface Agg {
  totalLeads: number;
  byAgent: Record<string, Bucket>; byLeasing: Record<string, Bucket>;
  byStatus: Record<string, Bucket>; byProduct: Record<string, Bucket>;
}
interface ApiRes { funnel: FunnelRow[]; agg: Agg | null; leadCount: number; updatedAt: string | null; note?: string }

function Card({ icon, label, value, sub, tone }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "good" | "bad";
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-0.02em", color: tone === "bad" ? "#DC2626" : tone === "good" ? "#059669" : "#0F172A" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
      <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: note ? 2 : 14 }}>{title}</div>
      {note && <div style={{ fontSize: 11.5, color: "#94A3B8", marginBottom: 14 }}>{note}</div>}
      {children}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12.5, boxShadow: "0 4px 14px rgba(15,23,42,.08)" },
  cursor: { fill: "rgba(148,163,184,.10)" },
};

export default function MarketingPage() {
  const [data, setData] = useState<ApiRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/marketing")
      .then(r => r.json())
      .then(d => { if (d.error) setErr(d.error); else setData(d); })
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Shell><div style={{ fontSize: 13, color: "#94A3B8" }}>กำลังโหลดข้อมูลการตลาด…</div></Shell>;
  if (err) return <Shell><div style={{ padding: 16, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, color: "#B91C1C", fontSize: 13 }}>โหลดข้อมูลไม่สำเร็จ: {err}</div></Shell>;

  const funnel = data?.funnel || [];
  const agg = data?.agg || null;

  if (!funnel.length && !agg) {
    return (
      <Shell>
        <div style={{ padding: 20, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, fontSize: 13.5, color: "#92400E" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>ยังไม่มีข้อมูลการตลาดในระบบ</div>
          {data?.note || 'พิมพ์ "force sync" ในไลน์เพื่อดึงข้อมูลรอบแรก แล้วรีเฟรชหน้านี้'}
        </div>
      </Shell>
    );
  }

  const tot = funnel.reduce((a, f) => ({
    chats: a.chats + f.chats, leads: a.leads + f.leads, submitted: a.submitted + f.submitted,
    adCost: a.adCost + f.adCost, revenue: a.revenue + f.revenue,
  }), { chats: 0, leads: 0, submitted: 0, adCost: 0, revenue: 0 });
  const totProfit = tot.revenue - tot.adCost;
  const totRoas = tot.adCost > 0 ? (tot.revenue / tot.adCost).toFixed(2) : "-";
  const leadRate = tot.chats > 0 ? ((tot.leads / tot.chats) * 100).toFixed(1) : "-";

  const chartData = funnel.map(f => ({
    label: `${TH[f.month]} ${String(f.yearBE).slice(2)}`,
    ทักแชท: f.chats, "รับ lead": f.leads, ส่งงาน: f.submitted,
    งบโฆษณา: Math.round(f.adCost), รายได้: Math.round(f.revenue),
  }));

  const rank = (obj: Record<string, Bucket> | undefined) =>
    Object.entries(obj || {}).sort((a, b) => b[1].count - a[1].count);
  const leasing = rank(agg?.byLeasing);
  const agents = rank(agg?.byAgent);
  const maxLeasing = leasing[0]?.[1].count || 1;

  return (
    <Shell>
      <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: -4 }}>
        ท่อ lead จากยิงแอด → ทักแชท → ส่งงานให้ลีสซิ่ง (คนละชุดกับยอดปิดส่วนกลาง)
        {data?.updatedAt && ` · อัปเดต ${new Date(data.updatedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}`}
      </div>

      {/* KPI */}
      <div className="grid-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
        <Card icon={<MessageCircle size={17} color={C_CHAT} />} label="ทักแชท" value={nf(tot.chats)} sub={`→ รับ lead ${leadRate}%`} />
        <Card icon={<Inbox size={17} color={C_LEAD} />} label="รับ Lead" value={nf(tot.leads)} />
        <Card icon={<Send size={17} color={C_SEND} />} label="ส่งงาน" value={nf(tot.submitted)} sub={agg ? `รายเคสในระบบ ${agg.totalLeads}` : undefined} />
        <Card icon={<Megaphone size={17} color={C_COST} />} label="งบโฆษณา" value={btShort(tot.adCost)} sub={bt(tot.adCost)} />
        <Card icon={<Wallet size={17} color={C_REV} />} label="รายได้จาก Lead" value={btShort(tot.revenue)} sub={bt(tot.revenue)} />
        <Card icon={<TrendingUp size={17} color={totProfit >= 0 ? "#059669" : "#DC2626"} />} label="กำไรจากแอด" value={btShort(totProfit)}
              sub={`ROAS ${totRoas} · รายได้ − งบ`} tone={totProfit >= 0 ? "good" : "bad"} />
      </div>

      {/* กราฟ 1: จำนวน (แกนเดียว) */}
      <Panel title="ท่อ Lead รายเดือน" note="จำนวนราย — ทักแชท → รับ lead → ส่งงาน">
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} barGap={2} barCategoryGap="22%" margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11.5, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11.5, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v) => nf(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12.5, paddingTop: 6 }} />
              <Bar dataKey="ทักแชท" fill={C_CHAT} radius={[4, 4, 0, 0]} />
              <Bar dataKey="รับ lead" fill={C_LEAD} radius={[4, 4, 0, 0]} />
              <Bar dataKey="ส่งงาน" fill={C_SEND} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* กราฟ 2: เงิน (แยกกราฟ ไม่ใช้แกนคู่) */}
      <Panel title="งบโฆษณา vs รายได้จาก Lead" note="หน่วยบาท — แยกกราฟจากด้านบนเพราะคนละหน่วย">
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} barGap={2} barCategoryGap="26%" margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11.5, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11.5, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(v) => btShort(Number(v))} />
              <Tooltip {...tooltipStyle} formatter={(v) => bt(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12.5, paddingTop: 6 }} />
              <Bar dataKey="งบโฆษณา" fill={C_COST} radius={[4, 4, 0, 0]} />
              <Bar dataKey="รายได้" fill={C_REV} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* ตารางรายเดือน — table view สำหรับอ่านค่าตรงๆ */}
      <Panel title="รายละเอียดรายเดือน">
        <div style={{ overflowX: "auto" }}>
          <table className="dtable" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 780 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#64748B" }}>
                {["เดือน", "ทักแชท", "รับ lead", "→%", "ส่งงาน", "→%", "อนุมัติ", "รอผล", "งบโฆษณา", "รายได้", "กำไร", "ROAS"].map(h => (
                  <th key={h} style={{ padding: "9px 10px", fontWeight: 600, whiteSpace: "nowrap", borderBottom: "1px solid #E2E8F0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {funnel.map(f => (
                <tr key={`${f.yearBE}-${f.month}`}>
                  <td style={{ padding: "9px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>{TH[f.month]} {f.yearBE}</td>
                  <td style={{ padding: "9px 10px" }}>{nf(f.chats)}</td>
                  <td style={{ padding: "9px 10px" }}>{nf(f.leads)}</td>
                  <td style={{ padding: "9px 10px", color: "#94A3B8" }}>{f.leadRate != null ? `${f.leadRate}%` : "-"}</td>
                  <td style={{ padding: "9px 10px" }}>{nf(f.submitted)}</td>
                  <td style={{ padding: "9px 10px", color: "#94A3B8" }}>{f.submitRate != null ? `${f.submitRate}%` : "-"}</td>
                  <td style={{ padding: "9px 10px" }}>{nf(f.approved)}</td>
                  <td style={{ padding: "9px 10px" }}>{nf(f.pending)}</td>
                  <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>{bt(f.adCost)}</td>
                  <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>{bt(f.revenue)}</td>
                  <td style={{ padding: "9px 10px", whiteSpace: "nowrap", fontWeight: 700, color: f.profit >= 0 ? "#059669" : "#DC2626" }}>{bt(f.profit)}</td>
                  <td style={{ padding: "9px 10px" }}>{f.roas != null ? f.roas : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ลีสซิ่ง + คนส่งงาน */}
      <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Panel title="ส่งลีสซิ่งแต่ละเจ้า" note="จำนวนเคสที่ส่ง (1 เคสส่งหลายเจ้า = นับทุกเจ้า)">
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {leasing.map(([name, v]) => (
              <div key={name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{name}</span>
                  <span style={{ color: "#64748B" }}>
                    {v.count} เคส · ผ่าน {v.approved} / รอ {v.pending} / ไม่ผ่าน {v.rejected}
                  </span>
                </div>
                <div style={{ height: 7, background: "#F1F5F9", borderRadius: 999 }}>
                  <div style={{ width: `${(v.count / maxLeasing) * 100}%`, height: "100%", background: C_SEND, borderRadius: 999 }} />
                </div>
              </div>
            ))}
            {!leasing.length && <div style={{ fontSize: 12.5, color: "#94A3B8" }}>ยังไม่มีข้อมูล</div>}
          </div>
        </Panel>

        <Panel title="คนส่งงาน" note="ทีมการตลาด — จำนวนเคสและผลอนุมัติ">
          <table className="dtable" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#64748B" }}>
                {["ชื่อ", "ส่ง", "อนุมัติ", "รอผล", "ไม่ผ่าน"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", fontWeight: 600, borderBottom: "1px solid #E2E8F0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map(([name, v]) => (
                <tr key={name}>
                  <td style={{ padding: "8px 10px", fontWeight: 600 }}>{name}</td>
                  <td style={{ padding: "8px 10px" }}>{v.count}</td>
                  <td style={{ padding: "8px 10px", color: "#059669" }}>{v.approved}</td>
                  <td style={{ padding: "8px 10px", color: "#D97706" }}>{v.pending}</td>
                  <td style={{ padding: "8px 10px", color: "#94A3B8" }}>{v.rejected}</td>
                </tr>
              ))}
              {!agents.length && <tr><td colSpan={5} style={{ padding: "8px 10px", color: "#94A3B8" }}>ยังไม่มีข้อมูล</td></tr>}
            </tbody>
          </table>
        </Panel>
      </div>
    </Shell>
  );
}
