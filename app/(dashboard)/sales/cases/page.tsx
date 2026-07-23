"use client";
import { useEffect, useMemo, useState } from "react";
import { Hash, X, ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle } from "lucide-react";
import Topbar from "@/components/Topbar";
import { rejectReasonOf } from "@/lib/rejectReason";

const TH = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// per-lead (มี PII)
interface Lead {
  seq: string; date: string; name: string; phone: string; product: string;
  leasing: string; leasingList?: string[]; update: string;
  status: string; statusGroup: string; note: string; agent: string;
  yearBE: number; month: number;
}

function statusStyle(g: string) {
  if (/อนุมัติ/.test(g) && !/ไม่/.test(g)) return { c: "#059669", bg: "#ECFDF5" };
  if (/รอ/.test(g)) return { c: "#D97706", bg: "#FFFBEB" };
  if (/ไม่ผ่าน|ไม่อนุมัติ/.test(g)) return { c: "#DC2626", bg: "#FEF2F2" };
  return { c: "#64748B", bg: "#F1F5F9" };
}
const Pill = ({ text, c, bg, title }: { text: string; c: string; bg: string; title?: string }) =>
  text ? <span title={title} style={{ fontSize: 11.5, fontWeight: 600, color: c, background: bg, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{text}</span> : <span style={{ color: "#CBD5E1" }}>—</span>;
const Trunc = ({ text, w }: { text: string; w: number }) =>
  <span title={text} style={{ display: "inline-block", maxWidth: w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>{text || "—"}</span>;

const leasingOf = (l: Lead) => (l.leasingList && l.leasingList.length ? l.leasingList.join(", ") : l.leasing) || "";
const uniq = (rows: Lead[], f: (l: Lead) => string) =>
  [...new Set(rows.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));
const csvCell = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

type SortKey = "name" | "phone" | "product" | "leasing" | "statusGroup" | "agent" | "update";
const COLS: { key: SortKey; label: string; get: (l: Lead) => string }[] = [
  { key: "name", label: "ลูกค้า", get: l => l.name },
  { key: "phone", label: "เบอร์", get: l => l.phone },
  { key: "product", label: "ผลิตภัณฑ์", get: l => l.product },
  { key: "leasing", label: "ลีสซิ่ง", get: l => leasingOf(l) },
  { key: "statusGroup", label: "สถานะ", get: l => l.statusGroup },
  { key: "agent", label: "คนส่งงาน", get: l => l.agent },
  { key: "update", label: "อัปเดตล่าสุด", get: l => l.update },
];

export default function SalesCasesPage() {
  const [monthKeys, setMonthKeys] = useState<string[]>([]);
  const [month, setMonth] = useState("");   // "" = รวมทุกเดือน
  const [ready, setReady] = useState(false); // โหลดรายชื่อเดือนเสร็จ
  const [cases, setCases] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fLeasing, setFLeasing] = useState("");
  const [fAgent, setFAgent] = useState("");
  const [fReason, setFReason] = useState("");   // เหตุผลไม่อนุมัติ (classify จาก note ฝั่ง client)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "update", dir: -1 });
  const [sel, setSel] = useState<Lead | null>(null);

  // มาจากการคลิกกลุ่มในหน้าสรุป (?leasing= / ?agent= / ?reason= / ?status= / ?month=)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const mth = p.get("month"); if (mth) setMonth(mth);
    const ls = p.get("leasing"); if (ls) setFLeasing(ls);
    const ag = p.get("agent"); if (ag) setFAgent(ag);
    const rs = p.get("reason"); if (rs) setFReason(rs);
    const st = p.get("status"); if (st) setFStatus(st);
  }, []);

  // รายชื่อเดือน — จาก /api/sales (agg month keys)
  useEffect(() => {
    fetch("/api/sales").then(r => r.json()).then(d => {
      if (d.error) { setErr(d.error); setLoading(false); return; }
      const a = d.agg;
      const keys = Array.from(new Set([
        ...Object.keys(a?.byLeasingMonth || {}),
        ...Object.keys(a?.byAgentMonth || {}),
        ...Object.keys(a?.byReasonMonth || {}),
      ])).sort((x, y) => { const [ay, am] = x.split("-").map(Number), [by, bm] = y.split("-").map(Number); return by - ay || bm - am; }) as string[];
      setMonthKeys(keys); setReady(true);
      if (!keys.length) setLoading(false);
    }).catch(e => { setErr(String(e)); setLoading(false); });
  }, []);

  // ดึงรายเคสตามเดือน
  useEffect(() => {
    if (!ready || !monthKeys.length) return;
    const months = month ? [month] : monthKeys;
    setLoading(true); setErr(null);
    fetch(`/api/sales/leads?months=${months.join(",")}`).then(r => r.json())
      .then(j => { if (j.error) setErr(j.error); setCases(Array.isArray(j.leads) ? j.leads : []); })
      .catch(e => setErr(String(e))).finally(() => setLoading(false));
  }, [ready, monthKeys, month]);

  const statusOpts = useMemo(() => uniq(cases, l => l.statusGroup), [cases]);
  const leasingOpts = useMemo(() => uniq(cases, l => leasingOf(l)), [cases]);
  const agentOpts = useMemo(() => uniq(cases, l => l.agent), [cases]);
  // เหตุผล: จัดหมวดเฉพาะเคสไม่ผ่าน แล้วเอาเฉพาะหมวดที่มีจริง
  const reasonOpts = useMemo(() =>
    [...new Set(cases.filter(l => l.statusGroup === "ไม่ผ่าน").map(l => rejectReasonOf(l.note, l.status)))]
      .sort((a, b) => a.localeCompare(b, "th")), [cases]);

  const result = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = cases.filter(l =>
      (!s || [l.name, l.phone, l.agent, leasingOf(l), l.product].some(x => String(x || "").toLowerCase().includes(s))) &&
      (!fStatus || l.statusGroup === fStatus) &&
      (!fLeasing || leasingOf(l) === fLeasing) &&
      (!fAgent || l.agent === fAgent) &&
      (!fReason || (l.statusGroup === "ไม่ผ่าน" && rejectReasonOf(l.note, l.status) === fReason))
    );
    const col = COLS.find(c => c.key === sort.key)!;
    out.sort((a, b) => col.get(a).localeCompare(col.get(b), "th") * sort.dir);
    return out;
  }, [cases, q, fStatus, fLeasing, fAgent, fReason, sort]);

  const clickSort = (key: SortKey) => setSort(s => s.key === key ? { key, dir: (s.dir === 1 ? -1 : 1) } : { key, dir: 1 });
  const monthLabel = (mk: string) => { const [y, m] = mk.split("-").map(Number); return `${TH[m]} ${y}`; };

  const exportCsv = () => {
    const cols: { h: string; get: (l: Lead) => string }[] = [
      { h: "ลำดับ", get: l => l.seq }, { h: "ลูกค้า", get: l => l.name }, { h: "เบอร์", get: l => l.phone },
      { h: "ผลิตภัณฑ์", get: l => l.product }, { h: "ลีสซิ่ง", get: l => leasingOf(l) },
      { h: "สถานะ", get: l => l.status }, { h: "กลุ่ม", get: l => l.statusGroup },
      { h: "คนส่งงาน", get: l => l.agent }, { h: "อัปเดต", get: l => l.update }, { h: "หมายเหตุ", get: l => l.note },
    ];
    const csv = "﻿" + [cols.map(c => c.h).join(","), ...result.map(l => cols.map(c => csvCell(c.get(l))).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `sales-cases-${month || "all"}.csv`; a.click();
  };

  const selStyle = { border: "1px solid #E2E8F0", borderRadius: 9, padding: "8px 12px", fontSize: 13.5, background: "#fff", cursor: "pointer" } as const;

  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "งานเซล", "รายการส่งเคส"]} title="รายการส่งเคส · งานเซล" />
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

        {err && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#B45309", display: "flex", gap: 8, alignItems: "center" }}>
            <AlertCircle size={14} /> {err}
          </div>
        )}

        {/* filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select value={month} onChange={e => setMonth(e.target.value)} style={selStyle}>
            <option value="">รวมทุกเดือน</option>
            {monthKeys.map(mk => <option key={mk} value={mk}>{monthLabel(mk)}</option>)}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 220px", maxWidth: 340, border: "1px solid #E2E8F0", borderRadius: 9, padding: "7px 12px", background: "#fff" }}>
            <Hash size={14} color="#94A3B8" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา ลูกค้า/เบอร์/คนส่งงาน/ลีสซิ่ง/ผลิตภัณฑ์" style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%" }} />
          </div>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={selStyle}><option value="">ทุกสถานะ</option>{statusOpts.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <select value={fLeasing} onChange={e => setFLeasing(e.target.value)} style={selStyle}><option value="">ทุกลีสซิ่ง</option>{leasingOpts.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <select value={fAgent} onChange={e => setFAgent(e.target.value)} style={selStyle}><option value="">ทุกคนส่งงาน</option>{agentOpts.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <select value={fReason} onChange={e => setFReason(e.target.value)} style={selStyle}><option value="">ทุกเหตุผล</option>{reasonOpts.map(t => <option key={t} value={t}>{t}</option>)}</select>
          {(fStatus || fLeasing || fAgent || fReason || q) && (
            <button onClick={() => { setQ(""); setFStatus(""); setFLeasing(""); setFAgent(""); setFReason(""); }}
              style={{ border: "1px solid #E2E8F0", background: "#fff", color: "#64748B", borderRadius: 9, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}>
              ล้างตัวกรอง
            </button>
          )}
          <button onClick={exportCsv} disabled={!result.length}
            style={{ marginLeft: "auto", border: "1px solid #2563EB", background: result.length ? "#2563EB" : "#93C5FD", color: "#fff", borderRadius: 9, padding: "8px 16px", fontSize: 13.5, fontWeight: 700, cursor: result.length ? "pointer" : "default" }}>
            Export CSV ({result.length})
          </button>
        </div>

        <div style={{ fontSize: 13, color: "#64748B" }}>
          แสดง <b style={{ color: "#0F172A" }}>{result.length}</b> เคส{result.length !== cases.length && ` (จาก ${cases.length})`}
        </div>

        {/* table */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          <div style={{ maxHeight: "calc(100vh - 260px)", overflow: "auto" }}>
            <table className="dtable" style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 11.5 }}>
                  {COLS.map(c => {
                    const active = sort.key === c.key;
                    return (
                      <th key={c.key} onClick={() => clickSort(c.key)}
                        style={{ padding: "12px 14px", fontWeight: 700, cursor: "pointer", userSelect: "none", color: active ? "#2563EB" : "#94A3B8", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#fff" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          {c.label}
                          {active ? (sort.dir === 1 ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ChevronsUpDown size={12} style={{ opacity: 0.35 }} />}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={COLS.length} style={{ padding: 28, textAlign: "center", color: "#94A3B8" }}>กำลังโหลด…</td></tr>
                ) : result.length === 0 ? (
                  <tr><td colSpan={COLS.length} style={{ padding: 28, textAlign: "center", color: "#94A3B8" }}>{cases.length ? "ไม่พบเคสตามเงื่อนไข" : "ไม่มีข้อมูล"}</td></tr>
                ) : result.map((l, i) => (
                  <tr key={l.seq + i} onClick={() => setSel(l)} style={{ cursor: "pointer" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}><Trunc text={l.name} w={160} /></td>
                    <td style={{ padding: "10px 14px", color: "#64748B", whiteSpace: "nowrap" }}>{l.phone || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}><Trunc text={l.product} w={120} /></td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}><Trunc text={leasingOf(l)} w={150} /></td>
                    <td style={{ padding: "10px 14px" }}><Pill text={l.statusGroup} title={l.status} {...statusStyle(l.statusGroup)} /></td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}><Trunc text={l.agent} w={120} /></td>
                    <td style={{ padding: "10px 14px", color: "#64748B" }}><Trunc text={l.update} w={220} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {sel && <LeadDetail lead={sel} onClose={() => setSel(null)} />}
    </>
  );
}

// ── Modal รายละเอียดเคส ──────────────────────────────────────────────
function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{value || <span style={{ color: "#CBD5E1", fontWeight: 400 }}>—</span>}</div>
    </div>
  );
}
function LeadDetail({ lead: l, onClose }: { lead: Lead; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 80, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 620, background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.3)", margin: "24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{l.name}</span>
            <Pill text={l.status || l.statusGroup} {...statusStyle(l.statusGroup)} />
          </div>
          <button onClick={onClose} aria-label="ปิด" style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={17} color="#64748B" />
          </button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px 16px" }}>
            <Item label="เบอร์ลูกค้า" value={l.phone} />
            <Item label="ผลิตภัณฑ์" value={l.product} />
            <Item label="คนส่งงาน" value={l.agent} />
            <Item label="ลีสซิ่งที่ส่ง" value={leasingOf(l)} />
            <Item label="เดือน" value={`${TH[l.month]} ${l.yearBE}`} />
            <Item label="สถานะ" value={l.status} />
          </div>
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>อัปเดตล่าสุด</div>
            <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{l.update || "—"}</div>
          </div>
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "#B91C1C", marginBottom: 4 }}>หมายเหตุ / เหตุผล</div>
            <div style={{ fontSize: 13, color: "#7F1D1D", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{l.note || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
