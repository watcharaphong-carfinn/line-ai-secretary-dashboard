"use client";
import { useEffect, useMemo, useState } from "react";
import { Send, Users, XCircle, Hash, X, ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle } from "lucide-react";
import Topbar from "@/components/Topbar";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "งานเซล · ส่งงาน"]} title="งานเซล · ติดตามการส่งงาน" />
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
        {children}
      </div>
    </>
  );
}

const C_SEND = "#7C3AED";
const TH = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const nf = (v: number) => Math.round(v || 0).toLocaleString("th-TH");

interface Bucket { count: number; approved: number; rejected: number; pending: number }
interface Agg {
  totalLeads: number;
  byAgent: Record<string, Bucket>; byLeasing: Record<string, Bucket>;
  byAgentMonth?: Record<string, Record<string, Bucket>>;
  byLeasingMonth?: Record<string, Record<string, Bucket>>;
  byReason?: Record<string, number>;
  byReasonMonth?: Record<string, Record<string, number>>;
}
interface ApiRes { agg: Agg | null; leadCount: number; updatedAt: string | null; note?: string }

// per-lead (มี PII) — จาก /api/sales/leads
interface Lead {
  seq: string; date: string; name: string; phone: string; product: string;
  leasing: string; leasingList?: string[]; update: string;
  status: string; statusGroup: string; note: string; agent: string;
  yearBE: number; month: number;
}

// สีสถานะตามกลุ่ม (อนุมัติ/รอผล/ไม่ผ่าน)
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

function Card({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-0.02em", color: "#0F172A" }}>{value}</div>
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

export default function SalesPage() {
  const [data, setData] = useState<ApiRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [breakMonth, setBreakMonth] = useState("");   // "" = รวมทุกเดือน — คุมทั้งสรุป + ตารางรายเคส

  // รายเคส (PII)
  const [cases, setCases] = useState<Lead[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [caseErr, setCaseErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fLeasing, setFLeasing] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "update", dir: -1 });
  const [sel, setSel] = useState<Lead | null>(null);

  useEffect(() => {
    fetch("/api/sales")
      .then(r => r.json())
      .then(d => { if (d.error) setErr(d.error); else setData(d); })
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // เดือนที่มีข้อมูล (ใหม่→เก่า) — ใช้ทั้ง dropdown สรุป และดึงรายเคส
  const monthKeys = useMemo(() => {
    const a = data?.agg;
    return Array.from(new Set([
      ...Object.keys(a?.byLeasingMonth || {}),
      ...Object.keys(a?.byAgentMonth || {}),
      ...Object.keys(a?.byReasonMonth || {}),
    ])).sort((x, y) => { const [ay, am] = x.split("-").map(Number), [by, bm] = y.split("-").map(Number); return by - ay || bm - am; });
  }, [data]);

  // ดึงรายเคสตามเดือนที่เลือก (breakMonth==="" = ทุกเดือน)
  useEffect(() => {
    if (!data?.agg || !monthKeys.length) return;
    const months = breakMonth ? [breakMonth] : monthKeys;
    setCasesLoading(true); setCaseErr(null); setQ(""); setFStatus(""); setFLeasing("");
    fetch(`/api/sales/leads?months=${months.join(",")}`)
      .then(r => r.json())
      .then(j => { if (j.error) setCaseErr(j.error); setCases(Array.isArray(j.leads) ? j.leads : []); })
      .catch(e => setCaseErr(String(e)))
      .finally(() => setCasesLoading(false));
  }, [data, monthKeys, breakMonth]);

  const statusOpts = useMemo(() => uniq(cases, l => l.statusGroup), [cases]);
  const leasingOpts = useMemo(() => uniq(cases, l => leasingOf(l)), [cases]);

  const result = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = cases.filter(l =>
      (!s || [l.name, l.phone, l.agent, leasingOf(l), l.product].some(x => String(x || "").toLowerCase().includes(s))) &&
      (!fStatus || l.statusGroup === fStatus) &&
      (!fLeasing || leasingOf(l) === fLeasing)
    );
    const col = COLS.find(c => c.key === sort.key)!;
    out.sort((a, b) => col.get(a).localeCompare(col.get(b), "th") * sort.dir);
    return out;
  }, [cases, q, fStatus, fLeasing, sort]);

  const clickSort = (key: SortKey) => setSort(s => s.key === key ? { key, dir: (s.dir === 1 ? -1 : 1) } : { key, dir: 1 });

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
    a.download = `sales-cases-${breakMonth || "all"}.csv`; a.click();
  };

  if (loading) return <Shell><div style={{ fontSize: 13, color: "#94A3B8" }}>กำลังโหลดข้อมูลงานเซล…</div></Shell>;
  if (err) return <Shell><div style={{ padding: 16, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, color: "#B91C1C", fontSize: 13 }}>โหลดข้อมูลไม่สำเร็จ: {err}</div></Shell>;

  const agg = data?.agg || null;
  if (!agg) {
    return (
      <Shell>
        <div style={{ padding: 20, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, fontSize: 13.5, color: "#92400E" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>ยังไม่มีข้อมูลงานเซลในระบบ</div>
          {data?.note || 'พิมพ์ "force sync" ในไลน์เพื่อดึงข้อมูลรอบแรก แล้วรีเฟรชหน้านี้'}
        </div>
      </Shell>
    );
  }

  const rank = (obj: Record<string, Bucket> | undefined) =>
    Object.entries(obj || {}).sort((a, b) => b[1].count - a[1].count);
  const monthLabel = (mk: string) => { const [y, m] = mk.split("-").map(Number); return `${TH[m]} ${y}`; };

  const leasing = rank(breakMonth ? agg.byLeasingMonth?.[breakMonth] : agg.byLeasing);
  const agents = rank(breakMonth ? agg.byAgentMonth?.[breakMonth] : agg.byAgent);
  const maxLeasing = leasing[0]?.[1].count || 1;
  const sumBuckets = (rows: [string, Bucket][]) => rows.reduce(
    (a, [, v]) => ({ count: a.count + v.count, approved: a.approved + v.approved, pending: a.pending + v.pending, rejected: a.rejected + v.rejected }),
    { count: 0, approved: 0, pending: 0, rejected: 0 });
  const leasingSum = sumBuckets(leasing);
  const agentSum = sumBuckets(agents);

  const reasonSrc = breakMonth ? (agg.byReasonMonth?.[breakMonth] || {}) : (agg.byReason || {});
  const reasons = Object.entries(reasonSrc).sort((a, b) => b[1] - a[1]);
  const reasonTotal = reasons.reduce((s, [, n]) => s + n, 0);
  const maxReason = reasons[0]?.[1] || 1;

  const selStyle = { border: "1px solid #E2E8F0", borderRadius: 9, padding: "8px 12px", fontSize: 13, background: "#fff", cursor: "pointer" } as const;

  return (
    <Shell>
      <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: -4 }}>
        การส่งงานของทีมเซลให้ลีสซิ่ง — ผลอนุมัติ/รอ/ไม่ผ่าน + เหตุผลที่ไม่อนุมัติ (คนละชุดกับยอดปิดส่วนกลาง)
        {data?.updatedAt && ` · อัปเดต ${new Date(data.updatedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}`}
      </div>

      {/* KPI */}
      <div className="grid-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
        <Card icon={<Send size={17} color={C_SEND} />} label="เคสส่งงาน" value={nf(agg.totalLeads)} sub={`ส่งลีสซิ่งรวม ${nf(leasingSum.count)} ครั้ง`} />
        <Card icon={<Users size={17} color="#2563EB" />} label="อนุมัติ" value={nf(agentSum.approved)} sub="ในชีตงานเซล" />
        <Card icon={<Users size={17} color="#D97706" />} label="รออนุมัติ" value={nf(agentSum.pending)} />
        <Card icon={<XCircle size={17} color="#DC2626" />} label="ไม่อนุมัติ" value={nf(agentSum.rejected)} sub="ดูเหตุผลด้านล่าง" />
      </div>

      {/* ตัวเลือกเดือน (คุมทั้งสรุป + ตารางรายเคส) */}
      {monthKeys.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>เลือกเดือน (คุมทั้งสรุปและรายเคสด้านล่าง):</span>
          <select value={breakMonth} onChange={e => setBreakMonth(e.target.value)} style={selStyle}>
            <option value="">รวมทุกเดือน</option>
            {monthKeys.map(mk => <option key={mk} value={mk}>{monthLabel(mk)}</option>)}
          </select>
        </div>
      )}

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
            {leasing.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginTop: 3, paddingTop: 10, borderTop: "1px solid #E2E8F0", fontWeight: 700 }}>
                <span>ยอดรวม</span>
                <span style={{ color: "#334155" }}>
                  {nf(leasingSum.count)} เคส · ผ่าน {nf(leasingSum.approved)} / รอ {nf(leasingSum.pending)} / ไม่ผ่าน {nf(leasingSum.rejected)}
                </span>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="คนส่งงาน" note="ทีมเซล — จำนวนเคสและผลอนุมัติ">
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
            {agents.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: "2px solid #E2E8F0" }}>
                  <td style={{ padding: "8px 10px" }}>ยอดรวม</td>
                  <td style={{ padding: "8px 10px" }}>{nf(agentSum.count)}</td>
                  <td style={{ padding: "8px 10px", color: "#059669" }}>{nf(agentSum.approved)}</td>
                  <td style={{ padding: "8px 10px", color: "#D97706" }}>{nf(agentSum.pending)}</td>
                  <td style={{ padding: "8px 10px", color: "#64748B" }}>{nf(agentSum.rejected)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </Panel>
      </div>

      {/* เหตุผลที่ไม่อนุมัติ */}
      <Panel
        title={`เหตุผลที่ไม่อนุมัติ${breakMonth ? ` · ${monthLabel(breakMonth)}` : " · รวมทุกเดือน"}`}
        note={`เคสไม่ผ่านทั้งหมด ${nf(reasonTotal)} เคส — จัดหมวดจากหมายเหตุการติดตาม`}
      >
        {reasons.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reasons.map(([name, n]) => (
              <div key={name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{name}</span>
                  <span style={{ color: "#64748B" }}>{nf(n)} เคส · {reasonTotal ? Math.round((n / reasonTotal) * 100) : 0}%</span>
                </div>
                <div style={{ height: 8, background: "#F1F5F9", borderRadius: 999 }}>
                  <div style={{ width: `${(n / maxReason) * 100}%`, height: "100%", background: "#DC2626", borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: "#94A3B8" }}>ไม่มีเคสไม่อนุมัติในช่วงที่เลือก 🎉</div>
        )}
      </Panel>

      {/* ── รายเคสทั้งหมด (กดดูรายละเอียด) ─────────────────────────── */}
      <Panel title={`รายเคสส่งงาน${breakMonth ? ` · ${monthLabel(breakMonth)}` : " · รวมทุกเดือน"}`} note="กดที่แถวเพื่อดูรายละเอียดเคส · ค้นหา/กรอง/Export ได้">
        {caseErr && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#B45309", display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <AlertCircle size={14} /> {caseErr}
          </div>
        )}
        {/* filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 220px", maxWidth: 340, border: "1px solid #E2E8F0", borderRadius: 9, padding: "7px 12px", background: "#fff" }}>
            <Hash size={14} color="#94A3B8" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา ลูกค้า/เบอร์/คนส่งงาน/ลีสซิ่ง/ผลิตภัณฑ์" style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%" }} />
          </div>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={selStyle}><option value="">ทุกสถานะ</option>{statusOpts.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <select value={fLeasing} onChange={e => setFLeasing(e.target.value)} style={selStyle}><option value="">ทุกลีสซิ่ง</option>{leasingOpts.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <button onClick={exportCsv} disabled={!result.length}
            style={{ marginLeft: "auto", border: "1px solid #2563EB", background: result.length ? "#2563EB" : "#93C5FD", color: "#fff", borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: result.length ? "pointer" : "default" }}>
            Export CSV ({result.length})
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 10 }}>
          แสดง <b style={{ color: "#0F172A" }}>{result.length}</b> เคส{result.length !== cases.length && ` (จาก ${cases.length})`}
        </div>
        {/* table */}
        <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ maxHeight: "calc(100vh - 260px)", overflow: "auto" }}>
            <table className="dtable" style={{ width: "100%", minWidth: 860, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 11.5 }}>
                  {COLS.map(c => {
                    const active = sort.key === c.key;
                    return (
                      <th key={c.key} onClick={() => clickSort(c.key)}
                        style={{ padding: "11px 12px", fontWeight: 700, cursor: "pointer", userSelect: "none", color: active ? "#2563EB" : "#94A3B8", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#fff" }}>
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
                {casesLoading ? (
                  <tr><td colSpan={COLS.length} style={{ padding: 28, textAlign: "center", color: "#94A3B8" }}>กำลังโหลด…</td></tr>
                ) : result.length === 0 ? (
                  <tr><td colSpan={COLS.length} style={{ padding: 28, textAlign: "center", color: "#94A3B8" }}>{cases.length ? "ไม่พบเคสตามเงื่อนไข" : "ไม่มีข้อมูลเดือนนี้"}</td></tr>
                ) : result.map((l, i) => (
                  <tr key={l.seq + i} onClick={() => setSel(l)} style={{ cursor: "pointer" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}><Trunc text={l.name} w={150} /></td>
                    <td style={{ padding: "10px 12px", color: "#64748B", whiteSpace: "nowrap" }}>{l.phone || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#475569" }}><Trunc text={l.product} w={120} /></td>
                    <td style={{ padding: "10px 12px", color: "#475569" }}><Trunc text={leasingOf(l)} w={150} /></td>
                    <td style={{ padding: "10px 12px" }}><Pill text={l.statusGroup} title={l.status} {...statusStyle(l.statusGroup)} /></td>
                    <td style={{ padding: "10px 12px", color: "#475569" }}><Trunc text={l.agent} w={120} /></td>
                    <td style={{ padding: "10px 12px", color: "#64748B" }}><Trunc text={l.update} w={200} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      {sel && <LeadDetail lead={sel} onClose={() => setSel(null)} />}
    </Shell>
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
