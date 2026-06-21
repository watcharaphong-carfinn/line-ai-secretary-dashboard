"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Layers, Coins, Briefcase, Trophy, Building2, Hash } from "lucide-react";

interface Bucket { deals: number; close: number; approved: number; commission: number; serviceFee: number; revenue: number; }
interface Agg { totalDeals: number; byMonth: Record<string, Bucket>; byAgent: Record<string, Bucket>; byBank: Record<string, Bucket>; byHub: Record<string, Bucket>; byType: Record<string, Bucket>; }

const TH = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmt = (v: number) => v >= 1_000_000 ? `฿${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `฿${(v / 1_000).toFixed(0)}K` : `฿${Math.round(v).toLocaleString()}`;
const fmtFull = (v: number) => `฿${Math.round(v || 0).toLocaleString("th-TH")}`;
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

export default function DealSummary() {
  const [agg, setAgg] = useState<Agg | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/deals").then(r => r.json()).then(d => setAgg(d.agg || null)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ fontSize: 13, color: "#94A3B8" }}>กำลังโหลดข้อมูลรายเคส…</div>;
  if (!agg) return null;

  const sum = (sel: (b: Bucket) => number) => Object.values(agg.byMonth).reduce((s, b) => s + sel(b), 0);
  const months = Object.keys(agg.byMonth).sort((a, b) => {
    const [ay, am] = a.split("-").map(Number), [by, bm] = b.split("-").map(Number); return ay - by || am - bm;
  }).slice(-12).map(k => { const [y, m] = k.split("-").map(Number); const v = agg.byMonth[k]; return { label: `${TH[m]} ${String(y).slice(2)}`, close: fmtM(v.close), revenue: fmtM(v.revenue) }; });
  const topAgents = Object.entries(agg.byAgent).sort((a, b) => b[1].close - a[1].close).slice(0, 8);
  const banks = Object.entries(agg.byBank).sort((a, b) => b[1].deals - a[1].deals).slice(0, 8);
  const types = Object.entries(agg.byType).sort((a, b) => b[1].deals - a[1].deals);
  const maxAgent = topAgents[0]?.[1].close || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6 }}>งานรายเคส · รีไฟแนนซ์/จำนำ</div>

      <div className="grid-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
        <Card icon={<Layers size={17} color="#2563EB" />} label="เคสทั้งหมด" value={agg.totalDeals.toLocaleString()} />
        <Card icon={<Briefcase size={17} color="#059669" />} label="ยอดปิดรวม" value={fmt(sum(b => b.close))} />
        <Card icon={<Coins size={17} color="#D97706" />} label="รายได้รวม" value={fmt(sum(b => b.revenue))} sub="ค่าคอม 3% + ค่าบริการ" />
        <Card icon={<Hash size={17} color="#7C3AED" />} label="ค่าคอมรวม" value={fmt(sum(b => b.commission))} />
      </div>

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

      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>ยอดปิด + รายได้ รายเดือน</div>
        <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 16 }}>หน่วยล้านบาท (฿M)</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={months} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
            <Tooltip formatter={(v) => [`฿${v}M`, ""]} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            <Bar dataKey="close" name="ยอดปิด" fill="#2563EB" radius={[5, 5, 0, 0]} />
            <Bar dataKey="revenue" name="รายได้" fill="#10B981" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Trophy size={17} color="#D97706" /><div style={{ fontSize: 16, fontWeight: 700 }}>Leaderboard เซลล์</div>
          </div>
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
        </div>

        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Building2 size={17} color="#2563EB" /><div style={{ fontSize: 16, fontWeight: 700 }}>สถาบันการเงินเดิม</div>
          </div>
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
        </div>
      </div>
    </div>
  );
}
