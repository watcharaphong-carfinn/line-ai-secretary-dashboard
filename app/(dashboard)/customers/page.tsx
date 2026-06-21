"use client";
import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import { Users, Hash, AlertCircle, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

const TH = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmtFull = (v: number) => `฿${Math.round(v || 0).toLocaleString("th-TH")}`;

interface DealRow {
  caseId: string; customerName: string; customerPhone: string; province: string; carPlate: string;
  agent: string; hub: string; bank: string; dealType: string; status: string; contactDate: string | null;
  closeAmount: number; approvedAmount: number; commission3: number; serviceFee: number; revenue: number;
}
type SortKey = keyof DealRow;
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const uniq = (rows: DealRow[], k: keyof DealRow) =>
  [...new Set(rows.map(r => String(r[k] || "")).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));

// คอลัมน์ + ว่าจัดเรียงได้ไหม + numeric ไหม
const COLS: { key: SortKey; label: string; num?: boolean; right?: boolean }[] = [
  { key: "caseId", label: "เลขที่เคส" },
  { key: "customerName", label: "ลูกค้า" },
  { key: "customerPhone", label: "เบอร์" },
  { key: "agent", label: "เซลล์" },
  { key: "bank", label: "ธนาคารเดิม" },
  { key: "dealType", label: "ประเภท" },
  { key: "status", label: "สถานะ" },
  { key: "contactDate", label: "วันติดต่อ" },
  { key: "closeAmount", label: "ยอดปิด", num: true, right: true },
  { key: "revenue", label: "รายได้", num: true, right: true },
];

export default function CustomersPage() {
  const [monthKeys, setMonthKeys] = useState<string[]>([]);
  const [month, setMonth] = useState("");
  const [rows, setRows] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fBank, setFBank] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "closeAmount", dir: -1 });

  useEffect(() => {
    fetch("/api/deals").then(r => r.json()).then(d => {
      const keys = d.agg ? Object.keys(d.agg.byMonth).sort((a: string, b: string) => {
        const [ay, am] = a.split("-").map(Number), [by, bm] = b.split("-").map(Number);
        return by - ay || bm - am;
      }) : [];
      setMonthKeys(keys);
      if (keys.length) setMonth(keys[0]); else setLoading(false);
      if (d.error) setErr(d.error);
    }).catch(e => { setErr(String(e)); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!month) return;
    setLoading(true); setFType(""); setFStatus(""); setFBank("");
    fetch(`/api/deals/list?month=${month}`).then(r => r.json())
      .then(j => { setRows(Array.isArray(j.deals) ? j.deals : []); if (j.error) setErr(j.error); })
      .catch(e => setErr(String(e))).finally(() => setLoading(false));
  }, [month]);

  const typeOpts = useMemo(() => uniq(rows, "dealType"), [rows]);
  const statusOpts = useMemo(() => uniq(rows, "status"), [rows]);
  const bankOpts = useMemo(() => uniq(rows, "bank"), [rows]);

  const result = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = rows.filter(d =>
      (!s || [d.customerName, d.agent, d.bank, d.caseId, d.customerPhone].some(x => String(x || "").toLowerCase().includes(s))) &&
      (!fType || d.dealType === fType) && (!fStatus || d.status === fStatus) && (!fBank || d.bank === fBank)
    );
    const col = COLS.find(c => c.key === sort.key);
    out.sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      let cmp: number;
      if (col?.num) cmp = (Number(av) || 0) - (Number(bv) || 0);
      else cmp = String(av || "").localeCompare(String(bv || ""), "th");
      return cmp * sort.dir;
    });
    return out;
  }, [rows, q, fType, fStatus, fBank, sort]);

  const clickSort = (key: SortKey, num?: boolean) =>
    setSort(s => s.key === key ? { key, dir: (s.dir === 1 ? -1 : 1) } : { key, dir: num ? -1 : 1 });

  const exportCsv = () => {
    const cols: (keyof DealRow)[] = ["caseId", "customerName", "customerPhone", "province", "carPlate", "agent", "hub", "bank", "dealType", "status", "contactDate", "closeAmount", "approvedAmount", "commission3", "serviceFee", "revenue"];
    const csv = "﻿" + [cols.join(","), ...result.map(d => cols.map(c => csvCell(d[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `customers-${month}.csv`; a.click();
  };
  const monthLabel = (mk: string) => { const [y, m] = mk.split("-").map(Number); return `${TH[m]} ${y}`; };
  const selStyle = { border: "1px solid #E2E8F0", borderRadius: 9, padding: "8px 12px", fontSize: 13.5, background: "#fff", cursor: "pointer" } as const;

  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "ฐานข้อมูลลูกค้า"]} title="ฐานข้อมูลลูกค้า · Customers" />
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 18 }}>

        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 18px", fontSize: 13, color: "#64748B", display: "flex", gap: 9, alignItems: "center" }}>
          <Users size={15} /> รายชื่อลูกค้า/เคส (รีไฟแนนซ์/จำนำ) — อนาคตจะรวมข้อมูลลูกค้าจากทุกแผนกไว้ที่นี่
        </div>

        {err && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#B45309", display: "flex", gap: 8, alignItems: "center" }}>
            <AlertCircle size={14} /> {err}
          </div>
        )}

        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          {/* filters */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 22px", borderBottom: "1px solid #F1F5F9", flexWrap: "wrap" }}>
            <select value={month} onChange={e => setMonth(e.target.value)} style={selStyle}>
              {monthKeys.length === 0 && <option>—</option>}
              {monthKeys.map(mk => <option key={mk} value={mk}>{monthLabel(mk)}</option>)}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 200px", maxWidth: 300, border: "1px solid #E2E8F0", borderRadius: 9, padding: "7px 12px", background: "#F8FAFC" }}>
              <Hash size={14} color="#94A3B8" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา ลูกค้า/เซลล์/ธนาคาร/เลขเคส/เบอร์" style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%" }} />
            </div>
            <select value={fType} onChange={e => setFType(e.target.value)} style={selStyle}>
              <option value="">ทุกประเภท</option>
              {typeOpts.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={selStyle}>
              <option value="">ทุกสถานะ</option>
              {statusOpts.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={fBank} onChange={e => setFBank(e.target.value)} style={selStyle}>
              <option value="">ทุกธนาคาร</option>
              {bankOpts.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={exportCsv} disabled={!result.length}
              style={{ marginLeft: "auto", border: "1px solid #2563EB", background: result.length ? "#2563EB" : "#93C5FD", color: "#fff", borderRadius: 9, padding: "8px 16px", fontSize: 13.5, fontWeight: 700, cursor: result.length ? "pointer" : "default" }}>
              Export CSV ({result.length})
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#94A3B8", textAlign: "left", fontSize: 11.5, background: "#F8FAFC", whiteSpace: "nowrap" }}>
                  {COLS.map(c => {
                    const active = sort.key === c.key;
                    return (
                      <th key={c.key} onClick={() => clickSort(c.key, c.num)}
                        style={{ padding: "11px 14px", fontWeight: 700, textAlign: c.right ? "right" : "left", cursor: "pointer", userSelect: "none", color: active ? "#2563EB" : "#94A3B8" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, flexDirection: c.right ? "row-reverse" : "row" }}>
                          {c.label}
                          {active ? (sort.dir === 1 ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />}
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
                  <tr><td colSpan={COLS.length} style={{ padding: 28, textAlign: "center", color: "#94A3B8" }}>{rows.length ? "ไม่พบเคสตามเงื่อนไข" : "ไม่มีข้อมูลเดือนนี้"}</td></tr>
                ) : result.map((d, i) => (
                  <tr key={d.caseId + i} style={{ borderTop: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#2563EB" }}>{d.caseId}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{d.customerName || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#64748B" }}>{d.customerPhone || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}>{d.agent || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}>{d.bank || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#64748B" }}>{d.dealType || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#64748B" }}>{d.status || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#64748B" }}>{d.contactDate || "—"}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>{fmtFull(d.closeAmount)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "#059669", fontWeight: 600 }}>{fmtFull(d.revenue)}</td>
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
