"use client";
import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import { Hash, AlertCircle, ChevronUp, ChevronDown, ChevronsUpDown, X } from "lucide-react";

const TH = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmtFull = (v: number) => `฿${Math.round(v || 0).toLocaleString("th-TH")}`;

interface DealRow {
  caseId: string; customerName: string; customerPhone: string; province: string; carModel: string;
  carPlate: string; plateProvince: string;
  agent: string; agentPhone: string; hub: string; bank: string; dealType: string; status: string;
  contactDate: string | null; milestones: Record<string, string>; note: string;
  closeAmount: number; approvedAmount: number; deposit: number; closeExtra: number; totalDraw: number;
  commission3: number; transferFee: number; serviceFee: number; vat7: number; revenue: number;
}
type SortKey = keyof DealRow;
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const uniq = (rows: DealRow[], k: keyof DealRow) =>
  [...new Set(rows.map(r => String(r[k] || "")).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));

// badge สีตามสถานะ / ประเภท → กวาดสายตาเร็ว
function statusStyle(s: string) {
  if (/สำเร็จ|ปิด|เสร็จ/.test(s)) return { c: "#059669", bg: "#ECFDF5" };
  if (/รอ|กำลัง|ระหว่าง/.test(s)) return { c: "#D97706", bg: "#FFFBEB" };
  if (/ยกเลิก|ไม่|ปฏิเสธ/.test(s)) return { c: "#DC2626", bg: "#FEF2F2" };
  return { c: "#64748B", bg: "#F1F5F9" };
}
const typeStyle = (t: string) => /จำนำ/.test(t) ? { c: "#7C3AED", bg: "#F5F3FF" } : { c: "#2563EB", bg: "#EFF6FF" };

const Pill = ({ text, c, bg }: { text: string; c: string; bg: string }) =>
  text ? <span style={{ fontSize: 11.5, fontWeight: 600, color: c, background: bg, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{text}</span> : <span style={{ color: "#CBD5E1" }}>—</span>;
const Trunc = ({ text, w }: { text: string; w: number }) =>
  <span title={text} style={{ display: "inline-block", maxWidth: w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>{text || "—"}</span>;

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
  const [sel, setSel] = useState<DealRow | null>(null);

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
      const cmp = col?.num ? (Number(av) || 0) - (Number(bv) || 0) : String(av || "").localeCompare(String(bv || ""), "th");
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
  const totalClose = result.reduce((s, d) => s + (d.closeAmount || 0), 0);

  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "ฐานข้อมูลลูกค้า"]} title="ฐานข้อมูลลูกค้า · Customers" />
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

        {err && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#B45309", display: "flex", gap: 8, alignItems: "center" }}>
            <AlertCircle size={14} /> {err}
          </div>
        )}

        {/* filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select value={month} onChange={e => setMonth(e.target.value)} style={selStyle}>
            {monthKeys.length === 0 && <option>—</option>}
            {monthKeys.map(mk => <option key={mk} value={mk}>{monthLabel(mk)}</option>)}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 220px", maxWidth: 320, border: "1px solid #E2E8F0", borderRadius: 9, padding: "7px 12px", background: "#fff" }}>
            <Hash size={14} color="#94A3B8" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา ลูกค้า/เซลล์/ธนาคาร/เลขเคส/เบอร์" style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%" }} />
          </div>
          <select value={fType} onChange={e => setFType(e.target.value)} style={selStyle}><option value="">ทุกประเภท</option>{typeOpts.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={selStyle}><option value="">ทุกสถานะ</option>{statusOpts.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <select value={fBank} onChange={e => setFBank(e.target.value)} style={selStyle}><option value="">ทุกธนาคาร</option>{bankOpts.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <button onClick={exportCsv} disabled={!result.length}
            style={{ marginLeft: "auto", border: "1px solid #2563EB", background: result.length ? "#2563EB" : "#93C5FD", color: "#fff", borderRadius: 9, padding: "8px 16px", fontSize: 13.5, fontWeight: 700, cursor: result.length ? "pointer" : "default" }}>
            Export CSV ({result.length})
          </button>
        </div>

        {/* สรุปผลที่กรอง */}
        <div style={{ fontSize: 13, color: "#64748B" }}>
          แสดง <b style={{ color: "#0F172A" }}>{result.length}</b> เคส{result.length !== rows.length && ` (จาก ${rows.length})`} · ยอดปิดรวม <b style={{ color: "#0F172A" }}>{fmtFull(totalClose)}</b>
        </div>

        {/* table */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          <div style={{ maxHeight: "calc(100vh - 290px)", overflow: "auto" }}>
            <table className="dtable" style={{ width: "100%", minWidth: 980, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 11.5 }}>
                  {COLS.map(c => {
                    const active = sort.key === c.key;
                    return (
                      <th key={c.key} onClick={() => clickSort(c.key, c.num)}
                        style={{ padding: "12px 14px", fontWeight: 700, textAlign: c.right ? "right" : "left", cursor: "pointer", userSelect: "none", color: active ? "#2563EB" : "#94A3B8", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, flexDirection: c.right ? "row-reverse" : "row" }}>
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
                  <tr><td colSpan={COLS.length} style={{ padding: 28, textAlign: "center", color: "#94A3B8" }}>{rows.length ? "ไม่พบเคสตามเงื่อนไข" : "ไม่มีข้อมูลเดือนนี้"}</td></tr>
                ) : result.map((d, i) => (
                  <tr key={d.caseId + i} onClick={() => setSel(d)} style={{ cursor: "pointer" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#2563EB", whiteSpace: "nowrap" }}>{d.caseId}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}><Trunc text={d.customerName} w={150} /></td>
                    <td style={{ padding: "10px 14px", color: "#64748B", whiteSpace: "nowrap" }}>{d.customerPhone || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}><Trunc text={d.agent} w={190} /></td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}><Trunc text={d.bank} w={120} /></td>
                    <td style={{ padding: "10px 14px" }}><Pill text={d.dealType} {...typeStyle(d.dealType)} /></td>
                    <td style={{ padding: "10px 14px" }}><Pill text={d.status} {...statusStyle(d.status)} /></td>
                    <td style={{ padding: "10px 14px", color: "#64748B", whiteSpace: "nowrap" }}>{d.contactDate || "—"}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtFull(d.closeAmount)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "#059669", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtFull(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {sel && <DealDetail deal={sel} onClose={() => setSel(null)} />}
    </>
  );
}

// ── Modal รายละเอียดเคส (2 คอลัมน์ กระชับ) ───────────────────────────────────────
function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, wordBreak: "break-word" }}>{value || <span style={{ color: "#CBD5E1", fontWeight: 400 }}>—</span>}</div>
    </div>
  );
}
const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "11px 20px" }}>{children}</div>
);
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 9 }}>{title}</div>
      {children}
    </div>
  );
}

function DealDetail({ deal: d, onClose }: { deal: DealRow; onClose: () => void }) {
  const money = (v: number) => v ? fmtFull(v) : "—";
  const ms = Object.entries(d.milestones || {});
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 80, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 720, background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.3)", margin: "24px 0" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 22px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#2563EB" }}>{d.caseId}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{d.customerName}</span>
            <Pill text={d.dealType} {...typeStyle(d.dealType)} />
            <Pill text={d.status} {...statusStyle(d.status)} />
          </div>
          <button onClick={onClose} aria-label="ปิด" style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={17} color="#64748B" />
          </button>
        </div>
        {/* body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* การเงิน — ไฮไลต์ 2 ตัวเด่น + ที่เหลือเป็น grid */}
          <div>
            <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ fontSize: 11.5, color: "#2563EB", fontWeight: 600 }}>ยอดปิด</div>
                <div style={{ fontSize: 21, fontWeight: 800, color: "#1E3A8A" }}>{money(d.closeAmount)}</div>
              </div>
              <div style={{ background: "#ECFDF5", borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ fontSize: 11.5, color: "#059669", fontWeight: 600 }}>รายได้รวม</div>
                <div style={{ fontSize: 21, fontWeight: 800, color: "#065F46" }}>{money(d.revenue)}</div>
              </div>
            </div>
            <Sec title="การเงิน (รายละเอียด)">
              <Grid>
                <Item label="ยอดอนุมัติ" value={money(d.approvedAmount)} />
                <Item label="รวมเบิกใช้" value={money(d.totalDraw)} />
                <Item label="มัดจำเล่ม" value={money(d.deposit)} />
                <Item label="ปิดเพิ่ม" value={money(d.closeExtra)} />
                <Item label="ค่าคอม (3%)" value={money(d.commission3)} />
                <Item label="ค่าบริการ" value={money(d.serviceFee)} />
                <Item label="ค่าโอน" value={money(d.transferFee)} />
                <Item label="VAT 7%" value={money(d.vat7)} />
              </Grid>
            </Sec>
          </div>

          <Sec title="ลูกค้า / รถ">
            <Grid>
              <Item label="เบอร์โทร" value={d.customerPhone} />
              <Item label="จังหวัด" value={d.province} />
              <Item label="ทะเบียนรถ" value={[d.carPlate, d.plateProvince].filter(Boolean).join(" ")} />
              <Item label="รุ่นรถ" value={d.carModel} />
            </Grid>
          </Sec>

          <Sec title="เจ้าหน้าที่ / ดีล">
            <Grid>
              <Item label="เซลล์/เจ้าหน้าที่" value={d.agent} />
              <Item label="เบอร์เจ้าหน้าที่" value={d.agentPhone} />
              <Item label="Hub/สาขา" value={d.hub} />
              <Item label="ธนาคารเดิม" value={d.bank} />
              <Item label="ประเภท" value={d.dealType} />
              <Item label="วันที่ลูกค้าติดต่อ" value={d.contactDate} />
            </Grid>
          </Sec>

          <Sec title={`ไทม์ไลน์ขั้นตอน (${ms.length})`}>
            {ms.length === 0 ? <div style={{ fontSize: 13, color: "#CBD5E1" }}>—</div> :
              <Grid>{ms.map(([label, date]) => <Item key={label} label={label} value={date} />)}</Grid>}
          </Sec>

          {d.note && (
            <Sec title="หมายเหตุ">
              <div style={{ fontSize: 13, color: "#475569", whiteSpace: "pre-wrap", background: "#F8FAFC", borderRadius: 10, padding: "12px 14px", lineHeight: 1.6 }}>{d.note}</div>
            </Sec>
          )}
        </div>
      </div>
    </div>
  );
}
