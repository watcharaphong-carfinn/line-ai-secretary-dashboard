"use client";
import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface BankEntry { close: number; approved: number }
interface StatsData {
  lastSync: string | null;
  today:        { close: number; approved: number; banks: Record<string, BankEntry> };
  yesterday:    { close: number; approved: number };
  currentMonth: { close: number; approved: number; banks: Record<string, BankEntry> };
  prevMonth:    { close: number; approved: number };
  dailyTrend:   { label: string; close: number | null; approved: number | null }[];
  monthlyTrend: { label: string; yearBE: number; close: number | null; approved: number | null }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(val: number): string {
  if (val >= 1_000_000) return `฿${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000)     return `฿${(val / 1_000).toFixed(0)}K`;
  return `฿${val.toLocaleString()}`;
}

function fmtM(val: number): number {
  return Math.round((val / 1_000_000) * 10) / 10;
}

function pct(cur: number, prev: number): { text: string; up: boolean } {
  if (!prev) return { text: "—", up: true };
  const diff = ((cur - prev) / prev) * 100;
  return { text: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}% จากเมื่อวาน`, up: diff >= 0 };
}

function pctMonth(cur: number, prev: number): { text: string; up: boolean } {
  if (!prev) return { text: "—", up: true };
  const diff = ((cur - prev) / prev) * 100;
  return { text: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}% จากเดือนที่แล้ว`, up: diff >= 0 };
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, change, up, loading }: {
  label: string; value: string; sub?: string; change: string; up: boolean; loading?: boolean;
}) {
  if (loading) {
    return (
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px" }}>
        <div style={{ height: 12, width: "60%", background: "#F1F5F9", borderRadius: 6, marginBottom: 12 }} />
        <div style={{ height: 28, width: "80%", background: "#F1F5F9", borderRadius: 6, marginBottom: 8 }} />
        <div style={{ height: 12, width: "50%", background: "#F1F5F9", borderRadius: 6 }} />
      </div>
    );
  }
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
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

export default function DashboardPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<7 | 30>(7);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
  const trendData = data
    ? (trendRange === 7 ? data.dailyTrend.slice(-7) : data.dailyTrend).map(d => ({
        ...d,
        close:    d.close    != null ? fmtM(d.close)    : null,
        approved: d.approved != null ? fmtM(d.approved) : null,
      }))
    : [];

  const yoyData = (() => {
    if (!data) return [];
    const map: Record<string, { month: string; y2568?: number; y2569?: number }> = {};
    for (const e of data.monthlyTrend) {
      if (e.close == null) continue;
      const k = e.label;
      if (!map[k]) map[k] = { month: k };
      if (e.yearBE === 2568) map[k].y2568 = fmtM(e.close);
      if (e.yearBE === 2569) map[k].y2569 = fmtM(e.close);
    }
    return Object.values(map).filter(r => r.y2568 != null || r.y2569 != null);
  })();

  const bankData = data
    ? Object.entries(data.currentMonth.banks)
        .map(([bank, v]) => ({ bank, amount: fmtM(v.close + v.approved), close: fmtM(v.close), approved: fmtM(v.approved) }))
        .filter(b => b.amount > 0)
        .sort((a, b) => b.amount - a.amount)
    : [];

  const maxBank = bankData[0]?.amount || 1;

  const todayClose    = pct(data?.today.close    || 0, data?.yesterday.close    || 0);
  const todayApproved = pct(data?.today.approved || 0, data?.yesterday.approved || 0);
  const monthClose    = pctMonth(data?.currentMonth.close    || 0, data?.prevMonth.close    || 0);
  const monthApproved = pctMonth(data?.currentMonth.approved || 0, data?.prevMonth.approved || 0);

  const lastSyncText = data?.lastSync
    ? new Date(data.lastSync).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก"]} title="Dashboard Overview · ภาพรวมระบบ" />
      <div style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* error banner */}
        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#DC2626", display: "flex", gap: 8, alignItems: "center" }}>
            <AlertCircle size={15} /> ดึงข้อมูลไม่สำเร็จ: {error}
            <button onClick={() => fetchStats()} style={{ marginLeft: "auto", fontSize: 12, background: "none", border: "1px solid #FECACA", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#DC2626" }}>ลองใหม่</button>
          </div>
        )}

        {/* ── KPIs ──────────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
          <KpiCard loading={loading} label="ยอดปิดวันนี้"       value={data ? fmt(data.today.close)           : "—"} change={todayClose.text}    up={todayClose.up} />
          <KpiCard loading={loading} label="ยอดอนุมัติวันนี้"   value={data ? fmt(data.today.approved)        : "—"} change={todayApproved.text} up={todayApproved.up} />
          <KpiCard loading={loading} label="ยอดปิดเดือนนี้"     value={data ? fmt(data.currentMonth.close)    : "—"} change={monthClose.text}    up={monthClose.up} />
          <KpiCard loading={loading} label="ยอดอนุมัติเดือนนี้" value={data ? fmt(data.currentMonth.approved) : "—"} change={monthApproved.text} up={monthApproved.up} />
        </div>

        {/* ── Trend chart ───────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Performance Trend · แนวโน้มยอด</div>
              <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 2 }}>ยอดปิดและยอดอนุมัติ (ล้านบาท)</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => fetchStats(true)} disabled={refreshing} title="รีเฟรช" style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <RefreshCw size={13} color="#64748B" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              </button>
              {([7, 30] as const).map((n) => (
                <button key={n} onClick={() => setTrendRange(n)} style={{
                  border: trendRange === n ? "1px solid #2563EB" : "1px solid #E2E8F0",
                  background: trendRange === n ? "#EFF6FF" : "#fff",
                  color: trendRange === n ? "#2563EB" : "#64748B",
                  fontSize: 12.5, fontWeight: 600, padding: "7px 13px", borderRadius: 8, cursor: "pointer",
                }}>{n} วัน</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${v}M`} />
              <Tooltip formatter={(v) => [`฿${v}M`, ""]} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
              <Line connectNulls type="monotone" dataKey="close"    name="ยอดปิด"    stroke="#2563EB" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Line connectNulls type="monotone" dataKey="approved" name="ยอดอนุมัติ" stroke="#10B981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
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
            <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 18 }}>ยอดปิด + อนุมัติแยกธนาคาร เดือนนี้</div>
            {bankData.length === 0 ? (
              <div style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", paddingTop: 40 }}>ไม่มีข้อมูลธนาคารเดือนนี้</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {bankData.map((b, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{b.bank}</span>
                      <span style={{ color: "#64748B" }}>ปิด ฿{b.close}M · อนุมัติ ฿{b.approved}M</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "#F1F5F9", overflow: "hidden" }}>
                      <div style={{ width: `${(b.amount / maxBank) * 100}%`, height: "100%", background: "#2563EB", borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Last sync ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 12, color: "#94A3B8", gap: 6, alignItems: "center" }}>
          <CheckCircle size={13} color="#10B981" />
          Sync ล่าสุด: {lastSyncText} น.
        </div>

      </div>
    </>
  );
}
