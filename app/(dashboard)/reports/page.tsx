"use client";
import { useState } from "react";
import Topbar from "@/components/Topbar";
import { Download, Search, Filter, ChevronUp, ChevronDown } from "lucide-react";

type SortDir = "asc" | "desc" | null;

const REPORTS = [
  { id: "LN-24817", date: "16 มิ.ย. 69", customer: "สมชาย เดชะกุล", type: "รถมือสอง", bank: "กสิกรไทย", amount: 1850000, status: "อนุมัติ", rate: 3.25 },
  { id: "LN-24816", date: "16 มิ.ย. 69", customer: "วรรณา สุวรรณ", type: "รถใหม่", bank: "ไทยพาณิชย์", amount: 1200000, status: "อนุมัติ", rate: 2.99 },
  { id: "LN-24815", date: "16 มิ.ย. 69", customer: "ประเสริฐ มานะ", type: "รีไฟแนนซ์", bank: "กรุงไทย", amount: 980000, status: "รอเอกสาร", rate: 3.49 },
  { id: "LN-24814", date: "15 มิ.ย. 69", customer: "นภาพร รักดี", type: "รถใหม่", bank: "กรุงเทพ", amount: 2100000, status: "ปฏิเสธ", rate: 0 },
  { id: "LN-24813", date: "15 มิ.ย. 69", customer: "อนันต์ พงษ์ศรี", type: "จำนำทะเบียน", bank: "ทหารไทยธนชาต", amount: 450000, status: "อนุมัติ", rate: 4.99 },
  { id: "LN-24812", date: "15 มิ.ย. 69", customer: "กนกวรรณ ใจดี", type: "รถมือสอง", bank: "กสิกรไทย", amount: 760000, status: "อนุมัติ", rate: 3.75 },
  { id: "LN-24811", date: "14 มิ.ย. 69", customer: "ธีรศักดิ์ วงษ์ทอง", type: "รถใหม่", bank: "ไทยพาณิชย์", amount: 1650000, status: "อนุมัติ", rate: 2.75 },
  { id: "LN-24810", date: "14 มิ.ย. 69", customer: "ปิยะ สงวนศิลป์", type: "รีไฟแนนซ์", bank: "กรุงไทย", amount: 1100000, status: "รออนุมัติ", rate: 0 },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  "อนุมัติ":    { bg: "#ECFDF5", color: "#059669" },
  "รออนุมัติ": { bg: "#EFF6FF", color: "#2563EB" },
  "รอเอกสาร": { bg: "#FFFBEB", color: "#D97706" },
  "ปฏิเสธ":   { bg: "#FEF2F2", color: "#DC2626" },
};

function Th({ children, sortable, dir, onClick }: {
  children: React.ReactNode; sortable?: boolean; dir?: SortDir; onClick?: () => void;
}) {
  return (
    <th onClick={onClick} style={{
      padding: "11px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700,
      color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em",
      background: "#F8FAFC", borderBottom: "1px solid #E2E8F0",
      cursor: sortable ? "pointer" : "default", whiteSpace: "nowrap",
      userSelect: "none",
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {children}
        {sortable && (
          <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <ChevronUp size={10} color={dir === "asc" ? "#2563EB" : "#CBD5E1"} />
            <ChevronDown size={10} color={dir === "desc" ? "#2563EB" : "#CBD5E1"} />
          </span>
        )}
      </span>
    </th>
  );
}

export default function ReportsPage() {
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [sort, setSort] = useState<{ col: string; dir: SortDir }>({ col: "date", dir: "desc" });

  const statuses = ["ทั้งหมด", "อนุมัติ", "รออนุมัติ", "รอเอกสาร", "ปฏิเสธ"];

  let rows = REPORTS.filter(r =>
    (filterStatus === "ทั้งหมด" || r.status === filterStatus) &&
    (q === "" || r.customer.includes(q) || r.id.includes(q) || r.bank.includes(q))
  );

  function toggleSort(col: string) {
    setSort(s => s.col === col
      ? { col, dir: s.dir === "asc" ? "desc" : "asc" }
      : { col, dir: "asc" }
    );
  }

  if (sort.col === "amount") {
    rows = [...rows].sort((a, b) => sort.dir === "asc" ? a.amount - b.amount : b.amount - a.amount);
  }

  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "Reports"]} title="Reports · รายงานสินเชื่อ" />
      <div style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 9, flex: 1, maxWidth: 340,
            border: "1px solid #E2E8F0", borderRadius: 10, padding: "9px 13px", background: "#fff",
          }}>
            <Search size={15} color="#94A3B8" />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="ค้นหา ชื่อ / เลขที่ / ธนาคาร…"
              style={{ border: "none", outline: "none", fontSize: 13, background: "transparent", width: "100%", color: "#0F172A" }}
            />
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {statuses.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                border: "1px solid",
                borderColor: filterStatus === s ? "#2563EB" : "#E2E8F0",
                background: filterStatus === s ? "#EFF6FF" : "#fff",
                color: filterStatus === s ? "#2563EB" : "#64748B",
                fontSize: 12.5, fontWeight: 600, padding: "7px 13px", borderRadius: 8, cursor: "pointer",
              }}>{s}</button>
            ))}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button style={{
              display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600,
              border: "1px solid #E2E8F0", borderRadius: 10, padding: "9px 16px",
              background: "#fff", color: "#475569", cursor: "pointer",
            }}>
              <Filter size={15} /> Filter
            </button>
            <button style={{
              display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600,
              border: "1px solid #2563EB", borderRadius: 10, padding: "9px 16px",
              background: "#2563EB", color: "#fff", cursor: "pointer",
            }}>
              <Download size={15} /> Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>เลขที่</Th>
                <Th>วันที่</Th>
                <Th>ชื่อลูกค้า</Th>
                <Th>ประเภท</Th>
                <Th>ธนาคาร</Th>
                <Th sortable dir={sort.col === "amount" ? sort.dir : null} onClick={() => toggleSort("amount")}>วงเงิน</Th>
                <Th>ดอกเบี้ย</Th>
                <Th>สถานะ</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #F1F5F9", background: i % 2 === 0 ? "#fff" : "#FAFBFD" }}>
                  <td style={{ padding: "13px 14px", fontSize: 13, fontWeight: 700, color: "#2563EB" }}>{r.id}</td>
                  <td style={{ padding: "13px 14px", fontSize: 13, color: "#64748B" }}>{r.date}</td>
                  <td style={{ padding: "13px 14px", fontSize: 13, fontWeight: 600 }}>{r.customer}</td>
                  <td style={{ padding: "13px 14px", fontSize: 13, color: "#475569" }}>{r.type}</td>
                  <td style={{ padding: "13px 14px", fontSize: 13, color: "#475569" }}>{r.bank}</td>
                  <td style={{ padding: "13px 14px", fontSize: 13, fontWeight: 700 }}>฿{r.amount.toLocaleString()}</td>
                  <td style={{ padding: "13px 14px", fontSize: 13, color: r.rate > 0 ? "#0F172A" : "#CBD5E1" }}>
                    {r.rate > 0 ? `${r.rate}%/ปี` : "–"}
                  </td>
                  <td style={{ padding: "13px 14px" }}>
                    <span style={{
                      ...(STATUS_STYLE[r.status] ?? { bg: "#F1F5F9", color: "#64748B" }),
                      background: (STATUS_STYLE[r.status] ?? { bg: "#F1F5F9" }).bg,
                      fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999,
                    }}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "12px 18px", borderTop: "1px solid #F1F5F9", fontSize: 12.5, color: "#94A3B8" }}>
            แสดง {rows.length} รายการ จาก {REPORTS.length} รายการ
          </div>
        </div>

      </div>
    </>
  );
}
