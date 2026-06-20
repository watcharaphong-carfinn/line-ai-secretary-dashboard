"use client";
import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Layers, Coins, Briefcase, Trophy, Building2, RefreshCw, AlertCircle, Hash } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Bucket { deals: number; close: number; approved: number; commission: number; serviceFee: number; revenue: number; }
interface Agg {
  totalDeals: number;
  byMonth: Record<string, Bucket>;
  byAgent: Record<string, Bucket>;
  byBank: Record<string, Bucket>;
  byHub: Record<string, Bucket>;
  byType: Record<string, Bucket>;
}
interface DealsResp { agg: Agg | null; dealCount: number; updatedAt: string | null; note?: string; error?: string; }

const TH = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function fmt(v: number): string {
  if (v >= 1_000_000) return `฿${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `฿${(v / 1_000).toFixed(0)}K`;
  return `฿${Math.round(v).toLocaleString()}`;
}
const fmtFull = (v: number) => `฿${Math.round(v).toLocaleString("th-TH")}`;
const fmtM = (v: number) => Math.round((v / 1_000_000) * 10) / 10;

function Card({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

interface DealRow {
  caseId: string; customerName: string; customerPhone: string; province: string; carPlate: string;
  agent: string; hub: string; bank: string; dealType: string; status: string; contactDate: string | null;
  closeAmount: number; approvedAmount: number; commission3: number; serviceFee: number; revenue: number;
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function DealsPage() {
  const [data, setData] = useState<DealsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // per-deal table
  const [pdMonth, setPdMonth] = useState("");
  const [pdDeals, setPdDeals] = useState<DealRow[]>([]);
  const [pdLoading, setPdLoading] = useState(false);
  const [q, setQ] = useState("");

  const load = async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await fetch("/api/deals");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setData({ agg: null, dealCount: 0, updatedAt: null, error: e instanceof Error ? e.message : String(e) });
    } finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const agg = data?.agg || null;

  // เดือนที่มี (ใหม่→เก่า) สำหรับเลือกดูตารางรายเคส
  const monthKeysDesc = agg ? Object.keys(agg.byMonth).sort((a, b) => {
    const [ay, am] = a.split("-").map(Number), [by, bm] = b.split("-").map(Number);
    return by - ay || bm - am;
  }) : [];
  useEffect(() => { if (!pdMonth && monthKeysDesc.length) setPdMonth(monthKeysDesc[0]); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pdMonth) return;
    setPdLoading(true);
    fetch(`/api/deals/list?month=${pdMonth}`).then(r => r.json())
      .then(j => setPdDeals(Array.isArray(j.deals) ? j.deals : []))
      .catch(() => setPdDeals([])).finally(() => setPdLoading(false));
  }, [pdMonth]);

  const filtered = pdDeals.filter(d => {
    const s = q.trim().toLowerCase();
    return !s || [d.customerName, d.agent, d.bank, d.caseId, d.customerPhone].some(x => String(x || "").toLowerCase().includes(s));
  });
  const exportCsv = () => {
    const cols: (keyof DealRow)[] = ["caseId", "customerName", "customerPhone", "province", "carPlate", "agent", "hub", "bank", "dealType", "status", "contactDate", "closeAmount", "approvedAmount", "commission3", "serviceFee", "revenue"];
    const csv = "﻿" + [cols.join(","), ...filtered.map(d => cols.map(c => csvCell(d[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `deals-${pdMonth}.csv`; a.click();
  };
  const TH2 = (mk: string) => { const [y, m] = mk.split("-").map(Number); return `${TH[m]} ${y}`; };
  const sum = (sel: (b: Bucket) => number) => agg ? Object.values(agg.byMonth).reduce((s, b) => s + sel(b), 0) : 0;
  const totalClose = sum(b => b.close);
  const totalRevenue = sum(b => b.revenue);
  const totalCommission = sum(b => b.commission);

  const months = agg ? Object.keys(agg.byMonth).sort((a, b) => {
    const [ay, am] = a.split("-").map(Number), [by, bm] = b.split("-").map(Number);
    return ay - by || am - bm;
  }).slice(-12).map(k => {
    const [y, m] = k.split("-").map(Number); const v = agg.byMonth[k];
    return { label: `${TH[m]} ${String(y).slice(2)}`, close: fmtM(v.close), revenue: fmtM(v.revenue), deals: v.deals };
  }) : [];

  const topAgents = agg ? Object.entries(agg.byAgent).sort((a, b) => b[1].close - a[1].close).slice(0, 10) : [];
  const banks = agg ? Object.entries(agg.byBank).sort((a, b) => b[1].deals - a[1].deals).slice(0, 12) : [];
  const types = agg ? Object.entries(agg.byType).sort((a, b) => b[1].deals - a[1].deals) : [];
  const maxAgent = topAgents[0]?.[1].close || 1;

  const updated = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "รายเคส"]} title="รายเคส · Deals (รีไฟแนนซ์/จำนำ)" />
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

        {/* states */}
        {!loading && data?.error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#DC2626", display: "flex", gap: 8, alignItems: "center" }}>
            <AlertCircle size={15} /> ดึงข้อมูลไม่สำเร็จ: {data.error}
            <button onClick={() => load()} style={{ marginLeft: "auto", fontSize: 12, border: "1px solid #FECACA", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#DC2626", background: "none" }}>ลองใหม่</button>
          </div>
        )}
        {!loading && !data?.error && !agg && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "14px 16px", fontSize: 13.5, color: "#B45309" }}>
            ⏳ ยังไม่มีข้อมูลรายเคส — รอ deal-sync รอบแรก (sync ประจำ 18:30/22:00) แล้วรีเฟรชหน้านี้
          </div>
        )}

        {/* summary */}
        <div className="grid-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
          <Card icon={<Layers size={17} color="#2563EB" />}  label="เคสทั้งหมด"  value={loading ? "…" : (data?.dealCount ?? 0).toLocaleString()} sub={`อัปเดต ${updated}`} />
          <Card icon={<Briefcase size={17} color="#059669" />} label="ยอดปิดรวม"   value={loading ? "…" : fmt(totalClose)} />
          <Card icon={<Coins size={17} color="#D97706" />}    label="รายได้รวม"   value={loading ? "…" : fmt(totalRevenue)} sub="ค่าคอม 3% + ค่าบริการ" />
          <Card icon={<Hash size={17} color="#7C3AED" />}     label="ค่าคอมรวม"   value={loading ? "…" : fmt(totalCommission)} />
        </div>

        {/* type split */}
        {types.length > 0 && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {types.map(([t, v]) => (
              <div key={t} style={{ flex: "1 1 220px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{t}</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{v.deals.toLocaleString()} เคส</div>
                <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 2 }}>ปิด {fmt(v.close)} · รายได้ {fmt(v.revenue)}</div>
              </div>
            ))}
          </div>
        )}

        {/* monthly chart */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>ยอดปิด + รายได้ รายเดือน</div>
              <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 2 }}>หน่วยล้านบาท (฿M)</div>
            </div>
            <button onClick={() => load(true)} disabled={refreshing} title="รีเฟรช" style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <RefreshCw size={13} color="#64748B" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={months} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
              <Tooltip formatter={(v) => [`฿${v}M`, ""]} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey="close"   name="ยอดปิด"   fill="#2563EB" radius={[5, 5, 0, 0]} />
              <Bar dataKey="revenue" name="รายได้"   fill="#10B981" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* leaderboard + banks */}
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          {/* agent leaderboard */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Trophy size={17} color="#D97706" /><div style={{ fontSize: 16, fontWeight: 700 }}>Leaderboard เซลล์ (ตามยอดปิด)</div>
            </div>
            {topAgents.length === 0 ? <div style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", padding: "30px 0" }}>—</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {topAgents.map(([name, v], i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13, gap: 8 }}>
                      <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i + 1}. {name || "(ไม่ระบุ)"}</span>
                      <span style={{ color: "#64748B", flexShrink: 0 }}>{fmt(v.close)} · {v.deals} เคส</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: "#F1F5F9", overflow: "hidden" }}>
                      <div style={{ width: `${(v.close / maxAgent) * 100}%`, height: "100%", background: "#2563EB", borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* bank table */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Building2 size={17} color="#2563EB" /><div style={{ fontSize: 16, fontWeight: 700 }}>สถาบันการเงินเดิม (ที่ไปปิด)</div>
            </div>
            {banks.length === 0 ? <div style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", padding: "30px 0" }}>—</div> : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: "#94A3B8", textAlign: "left", fontSize: 11.5 }}>
                    <th style={{ padding: "6px 4px", fontWeight: 600 }}>ธนาคาร</th>
                    <th style={{ padding: "6px 4px", fontWeight: 600, textAlign: "right" }}>เคส</th>
                    <th style={{ padding: "6px 4px", fontWeight: 600, textAlign: "right" }}>ยอดปิด</th>
                  </tr>
                </thead>
                <tbody>
                  {banks.map(([b, v]) => (
                    <tr key={b} style={{ borderTop: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "8px 4px", fontWeight: 600 }}>{b}</td>
                      <td style={{ padding: "8px 4px", textAlign: "right", color: "#64748B" }}>{v.deals}</td>
                      <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 600 }}>{fmtFull(v.close)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── ตารางรายเคส (per-deal) + ค้นหา/export ───────────────────────────── */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 22px", borderBottom: "1px solid #F1F5F9", flexWrap: "wrap" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>ตารางรายเคส</div>
            <select value={pdMonth} onChange={e => setPdMonth(e.target.value)}
              style={{ border: "1px solid #E2E8F0", borderRadius: 9, padding: "8px 12px", fontSize: 13.5, background: "#fff", cursor: "pointer" }}>
              {monthKeysDesc.length === 0 && <option>—</option>}
              {monthKeysDesc.map(mk => <option key={mk} value={mk}>{TH2(mk)}</option>)}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 200px", maxWidth: 320, border: "1px solid #E2E8F0", borderRadius: 9, padding: "7px 12px", background: "#F8FAFC" }}>
              <Hash size={14} color="#94A3B8" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา ลูกค้า/เซลล์/ธนาคาร/เลขเคส"
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%" }} />
            </div>
            <button onClick={exportCsv} disabled={!filtered.length}
              style={{ marginLeft: "auto", border: "1px solid #2563EB", background: filtered.length ? "#2563EB" : "#93C5FD", color: "#fff", borderRadius: 9, padding: "8px 16px", fontSize: 13.5, fontWeight: 700, cursor: filtered.length ? "pointer" : "default" }}>
              Export CSV ({filtered.length})
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 880, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#94A3B8", textAlign: "left", fontSize: 11.5, background: "#F8FAFC", whiteSpace: "nowrap" }}>
                  {["เลขที่เคส", "ลูกค้า", "เบอร์", "เซลล์", "ธนาคารเดิม", "ประเภท", "สถานะ", "วันติดต่อ", "ยอดปิด", "รายได้"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", fontWeight: 700, textAlign: h === "ยอดปิด" || h === "รายได้" ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pdLoading ? (
                  <tr><td colSpan={10} style={{ padding: 28, textAlign: "center", color: "#94A3B8" }}>กำลังโหลด…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: 28, textAlign: "center", color: "#94A3B8" }}>{pdDeals.length ? "ไม่พบเคสที่ค้นหา" : "ไม่มีข้อมูลเดือนนี้"}</td></tr>
                ) : filtered.map((d, i) => (
                  <tr key={d.caseId + i} style={{ borderTop: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#2563EB" }}>{d.caseId}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{d.customerName || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#64748B" }}>{d.customerPhone || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}>{d.agent || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}>{d.bank || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#64748B" }}>{d.dealType || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#64748B" }}>{d.status || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#64748B" }}>{d.contactDate || "—"}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>{fmtFull(d.closeAmount || 0)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "#059669", fontWeight: 600 }}>{fmtFull(d.revenue || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
