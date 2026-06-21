"use client";
import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { Users, RefreshCw, Hash, AlertCircle } from "lucide-react";

const TH = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmtFull = (v: number) => `฿${Math.round(v || 0).toLocaleString("th-TH")}`;

interface DealRow {
  caseId: string; customerName: string; customerPhone: string; province: string; carPlate: string;
  agent: string; hub: string; bank: string; dealType: string; status: string; contactDate: string | null;
  closeAmount: number; approvedAmount: number; commission3: number; serviceFee: number; revenue: number;
}
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function CustomersPage() {
  const [monthKeys, setMonthKeys] = useState<string[]>([]);
  const [month, setMonth] = useState("");
  const [rows, setRows] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // โหลดรายชื่อเดือนที่มีข้อมูล (จาก aggregates)
  useEffect(() => {
    fetch("/api/deals").then(r => r.json()).then(d => {
      const keys = d.agg ? Object.keys(d.agg.byMonth).sort((a: string, b: string) => {
        const [ay, am] = a.split("-").map(Number), [by, bm] = b.split("-").map(Number);
        return by - ay || bm - am;
      }) : [];
      setMonthKeys(keys);
      if (keys.length) setMonth(keys[0]);
      else setLoading(false);
      if (d.error) setErr(d.error);
    }).catch(e => { setErr(String(e)); setLoading(false); });
  }, []);

  // โหลดตารางตามเดือน
  useEffect(() => {
    if (!month) return;
    setLoading(true);
    fetch(`/api/deals/list?month=${month}`).then(r => r.json())
      .then(j => { setRows(Array.isArray(j.deals) ? j.deals : []); if (j.error) setErr(j.error); })
      .catch(e => setErr(String(e))).finally(() => setLoading(false));
  }, [month]);

  const filtered = rows.filter(d => {
    const s = q.trim().toLowerCase();
    return !s || [d.customerName, d.agent, d.bank, d.caseId, d.customerPhone].some(x => String(x || "").toLowerCase().includes(s));
  });
  const exportCsv = () => {
    const cols: (keyof DealRow)[] = ["caseId", "customerName", "customerPhone", "province", "carPlate", "agent", "hub", "bank", "dealType", "status", "contactDate", "closeAmount", "approvedAmount", "commission3", "serviceFee", "revenue"];
    const csv = "﻿" + [cols.join(","), ...filtered.map(d => cols.map(c => csvCell(d[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `customers-${month}.csv`; a.click();
  };
  const monthLabel = (mk: string) => { const [y, m] = mk.split("-").map(Number); return `${TH[m]} ${y}`; };

  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "ฐานข้อมูลลูกค้า"]} title="ฐานข้อมูลลูกค้า · Customers" />
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 18 }}>

        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 18px", fontSize: 13, color: "#64748B", display: "flex", gap: 9, alignItems: "center" }}>
          <Users size={15} /> รายชื่อลูกค้า/เคสจากงานส่วนกลาง (รีไฟแนนซ์/จำนำ) — อนาคตจะรวมข้อมูลลูกค้าจากทุกแผนกไว้ที่นี่
        </div>

        {err && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#B45309", display: "flex", gap: 8, alignItems: "center" }}>
            <AlertCircle size={14} /> {err}
          </div>
        )}

        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", borderBottom: "1px solid #F1F5F9", flexWrap: "wrap" }}>
            <select value={month} onChange={e => setMonth(e.target.value)}
              style={{ border: "1px solid #E2E8F0", borderRadius: 9, padding: "8px 12px", fontSize: 13.5, background: "#fff", cursor: "pointer" }}>
              {monthKeys.length === 0 && <option>—</option>}
              {monthKeys.map(mk => <option key={mk} value={mk}>{monthLabel(mk)}</option>)}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 200px", maxWidth: 340, border: "1px solid #E2E8F0", borderRadius: 9, padding: "7px 12px", background: "#F8FAFC" }}>
              <Hash size={14} color="#94A3B8" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา ลูกค้า/เซลล์/ธนาคาร/เลขเคส/เบอร์"
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%" }} />
            </div>
            <button onClick={exportCsv} disabled={!filtered.length}
              style={{ marginLeft: "auto", border: "1px solid #2563EB", background: filtered.length ? "#2563EB" : "#93C5FD", color: "#fff", borderRadius: 9, padding: "8px 16px", fontSize: 13.5, fontWeight: 700, cursor: filtered.length ? "pointer" : "default" }}>
              Export CSV ({filtered.length})
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#94A3B8", textAlign: "left", fontSize: 11.5, background: "#F8FAFC", whiteSpace: "nowrap" }}>
                  {["เลขที่เคส", "ลูกค้า", "เบอร์", "เซลล์", "ธนาคารเดิม", "ประเภท", "สถานะ", "วันติดต่อ", "ยอดปิด", "รายได้"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", fontWeight: 700, textAlign: h === "ยอดปิด" || h === "รายได้" ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ padding: 28, textAlign: "center", color: "#94A3B8" }}>กำลังโหลด…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: 28, textAlign: "center", color: "#94A3B8" }}>{rows.length ? "ไม่พบเคสที่ค้นหา" : "ไม่มีข้อมูลเดือนนี้"}</td></tr>
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
