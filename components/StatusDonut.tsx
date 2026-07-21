"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon, ArrowRight } from "lucide-react";

// ชุดสี categorical ผ่าน validator (worst CVD ΔE 8.6 · contrast ผ่านทั้งหมด)
const PALETTE = ["#2563EB", "#D97706", "#7C3AED", "#059669", "#DC2626", "#0891B2", "#DB2777"];
const GREY = "#94A3B8";

interface StatusBucket { count: number; close: number }
interface Agg { byStatusMonth?: Record<string, Record<string, StatusBucket>> }

const nf = (v: number) => Math.round(v || 0).toLocaleString("th-TH");
const bt = (v: number) => `฿${nf(v)}`;
const TH = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const mkLabel = (k: string) => { const [y, m] = k.split("-").map(Number); return `${TH[m]} ${String(y).slice(2)}`; };

const RANGES = [
  { label: "เดือนล่าสุด", n: 1 },
  { label: "3 เดือน", n: 3 },
  { label: "6 เดือน", n: 6 },
  { label: "12 เดือน", n: 12 },
  { label: "ทั้งหมด", n: Infinity },
];

export default function StatusDonut() {
  const router = useRouter();
  const [agg, setAgg] = useState<Agg | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeIdx, setRangeIdx] = useState(1); // เริ่มที่ 3 เดือน
  const goFollowup = (status?: string) => router.push(status && status !== "อื่นๆ" ? `/followup?status=${encodeURIComponent(status)}` : "/followup");

  useEffect(() => {
    fetch("/api/deals").then(r => r.json()).then(d => setAgg(d.agg || null)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const months = useMemo(() => {
    const keys = Object.keys(agg?.byStatusMonth || {});
    return keys.sort((a, b) => { const [ay, am] = a.split("-").map(Number), [by, bm] = b.split("-").map(Number); return ay - by || am - bm; });
  }, [agg]);

  const { slices, total, totalClose, rangeText } = useMemo(() => {
    const bsm = agg?.byStatusMonth || {};
    const n = RANGES[rangeIdx].n;
    const picked = n === Infinity ? months : months.slice(-n);
    const sum: Record<string, StatusBucket> = {};
    for (const mk of picked) {
      for (const [st, v] of Object.entries(bsm[mk] || {})) {
        const b = (sum[st] = sum[st] || { count: 0, close: 0 });
        b.count += v.count; b.close += v.close;
      }
    }
    let arr = Object.entries(sum).map(([status, v]) => ({ status, ...v })).sort((a, b) => b.count - a.count);
    // เกิน 7 สถานะ → รวมที่เหลือเป็น "อื่นๆ"
    if (arr.length > 7) {
      const head = arr.slice(0, 6);
      const rest = arr.slice(6).reduce((a, x) => ({ status: "อื่นๆ", count: a.count + x.count, close: a.close + x.close }), { status: "อื่นๆ", count: 0, close: 0 });
      arr = [...head, rest];
    }
    const total = arr.reduce((s, x) => s + x.count, 0);
    const totalClose = arr.reduce((s, x) => s + x.close, 0);
    const rt = picked.length ? (picked.length === 1 ? mkLabel(picked[0]) : `${mkLabel(picked[0])} – ${mkLabel(picked[picked.length - 1])}`) : "";
    return { slices: arr, total, totalClose, rangeText: rt };
  }, [agg, months, rangeIdx]);

  if (loading) return null;
  if (!agg?.byStatusMonth || !months.length) return null;

  const colorOf = (i: number, status: string) => (status === "อื่นๆ" ? GREY : PALETTE[i % PALETTE.length]);

  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
          <PieIcon size={17} color="#2563EB" /> สรุปสถานะเคส
        </div>
        {/* range selector */}
        <div style={{ display: "flex", gap: 4, background: "#F1F5F9", padding: 3, borderRadius: 10 }}>
          {RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setRangeIdx(i)} style={{
              border: "none", borderRadius: 8, padding: "5px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: rangeIdx === i ? "#fff" : "transparent", color: rangeIdx === i ? "#0F172A" : "#64748B",
              boxShadow: rangeIdx === i ? "0 1px 2px rgba(15,23,42,.08)" : "none",
            }}>{r.label}</button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16 }}>{rangeText} · รวม {nf(total)} เคส · ยอดปิด {bt(totalClose)}</div>

      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        {/* Donut */}
        <div style={{ width: 220, height: 220, position: "relative", flexShrink: 0 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={slices} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={62} outerRadius={92}
                   paddingAngle={2} stroke="#fff" strokeWidth={2} onClick={(_, i) => goFollowup(slices[i]?.status)} style={{ cursor: "pointer" }}>
                {slices.map((s, i) => <Cell key={s.status} fill={colorOf(i, s.status)} />)}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12.5 }}
                formatter={(v, _n, item) => {
                  const close = (item as { payload?: { close?: number } })?.payload?.close || 0;
                  return [`${nf(Number(v))} เคส · ${bt(close)}`, ""];
                }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{nf(total)}</div>
            <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2 }}>เคสทั้งหมด</div>
          </div>
        </div>

        {/* Legend / list */}
        <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 9 }}>
          {slices.map((s, i) => {
            const pct = total ? Math.round((s.count / total) * 100) : 0;
            return (
              <button key={s.status} onClick={() => goFollowup(s.status)} title={`ดูเคส "${s.status}"`}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", padding: "3px 4px", borderRadius: 7, cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: colorOf(i, s.status), flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.status}</span>
                <span style={{ fontSize: 12.5, color: "#64748B", whiteSpace: "nowrap" }}>
                  <b style={{ color: "#0F172A" }}>{nf(s.count)}</b> · {pct}%
                </span>
              </button>
            );
          })}
          <button onClick={() => goFollowup()} style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#2563EB", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "4px" }}>
            ดู &amp; ติดตามงานค้างทั้งหมด <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
