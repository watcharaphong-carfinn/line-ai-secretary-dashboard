"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import Topbar from "@/components/Topbar";
import { AlertCircle, X, Search, Clock, Phone, User } from "lucide-react";

const TH = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const fmtFull = (v: number) => `฿${Math.round(v || 0).toLocaleString("th-TH")}`;
const mkLabel = (k: string) => { const [y, m] = k.split("-").map(Number); return `${TH[m]} ${String(y).slice(2)}`; };

interface Deal {
  caseId: string; customerName: string; customerPhone: string; province: string;
  carPlate: string; plateProvince: string; agent: string; agentPhone: string; hub: string;
  bank: string; dealType: string; status: string; contactDate: string | null;
  milestones: Record<string, string>; note: string;
  closeAmount: number; approvedAmount: number; revenue: number;
  _month?: string;
}

// งานค้าง = ยังไม่ปิด/ยังไม่ยกเลิก
const isDone = (s: string) => /สำเร็จ|ปิดแล้ว|เสร็จสิ้น/.test(s);
const isCancelled = (s: string) => /ยกเลิก|ปฏิเสธ|ไม่อนุมัติ|ตีกลับ/.test(s);
const isPending = (s: string) => !isDone(s) && !isCancelled(s);

function statusStyle(s: string) {
  if (isDone(s)) return { c: "#059669", bg: "#ECFDF5" };
  if (isCancelled(s)) return { c: "#DC2626", bg: "#FEF2F2" };
  if (/รอ|กำลัง|ระหว่าง/.test(s)) return { c: "#D97706", bg: "#FFFBEB" };
  return { c: "#64748B", bg: "#F1F5F9" };
}
const Pill = ({ text }: { text: string }) => {
  const st = statusStyle(text);
  return text ? <span style={{ fontSize: 11.5, fontWeight: 600, color: st.c, background: st.bg, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{text}</span> : <span style={{ color: "#CBD5E1" }}>—</span>;
};

const RANGES = [{ label: "1 เดือน", n: 1 }, { label: "3 เดือน", n: 3 }, { label: "6 เดือน", n: 6 }, { label: "12 เดือน", n: 12 }];

// วันที่ค้าง (จากวันติดต่อล่าสุด หรือ milestone ล่าสุด → วันนี้)
function daysPending(d: Deal): number | null {
  const dates = [d.contactDate, ...Object.values(d.milestones || {})].filter(Boolean) as string[];
  if (!dates.length) return null;
  const latest = dates.map(s => new Date(s).getTime()).filter(t => !isNaN(t)).sort((a, b) => b - a)[0];
  if (!latest) return null;
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })).getTime();
  return Math.max(0, Math.floor((today - latest) / 86400000));
}
const ageColor = (n: number | null) => n == null ? "#CBD5E1" : n >= 30 ? "#DC2626" : n >= 14 ? "#D97706" : "#64748B";

export default function FollowupPage() {
  const [months, setMonths] = useState<string[]>([]);
  const [rangeIdx, setRangeIdx] = useState(1); // 3 เดือน
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [fStatus, setFStatus] = useState("");
  const [fAgent, setFAgent] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Deal | null>(null);

  // มาจากโดนัทหน้าภาพรวม (?status=...) → กรองสถานะนั้นเลย
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    if (s) { setFStatus(s); setPendingOnly(false); }
  }, []);

  // เดือนที่มีข้อมูล
  useEffect(() => {
    fetch("/api/deals").then(r => r.json()).then(d => {
      const keys = Object.keys(d.agg?.byStatusMonth || d.agg?.byMonth || {});
      setMonths(keys.sort((a, b) => { const [ay, am] = a.split("-").map(Number), [by, bm] = b.split("-").map(Number); return ay - by || am - bm; }));
    }).catch(e => setErr(String(e)));
  }, []);

  const picked = useMemo(() => months.slice(-RANGES[rangeIdx].n), [months, rangeIdx]);

  // โหลดดีลของเดือนในช่วง
  const loadDeals = useCallback(() => {
    if (!picked.length) { setDeals([]); setLoading(false); return; }
    setLoading(true); setErr(null);
    Promise.all(picked.map(mk =>
      fetch(`/api/deals/list?month=${mk}`).then(r => r.json()).then(d => (d.deals || []).map((x: Deal) => ({ ...x, _month: mk }))).catch(() => [])
    )).then(arrs => setDeals(arrs.flat())).catch(e => setErr(String(e))).finally(() => setLoading(false));
  }, [picked]);
  useEffect(() => { loadDeals(); }, [loadDeals]);

  const statusOpts = useMemo(() => [...new Set(deals.filter(d => !pendingOnly || isPending(d.status)).map(d => d.status).filter(Boolean))].sort(), [deals, pendingOnly]);
  const agentOpts = useMemo(() => [...new Set(deals.map(d => d.agent).filter(Boolean))].sort(), [deals]);

  const result = useMemo(() => {
    const s = q.trim().toLowerCase();
    return deals
      .filter(d => (!pendingOnly || isPending(d.status))
        && (!fStatus || d.status === fStatus)
        && (!fAgent || d.agent === fAgent)
        && (!s || [d.customerName, d.customerPhone, d.caseId, d.agent].some(x => String(x || "").toLowerCase().includes(s))))
      .map(d => ({ ...d, _age: daysPending(d) }))
      .sort((a, b) => (b._age ?? -1) - (a._age ?? -1)); // ค้างนานสุดก่อน
  }, [deals, pendingOnly, fStatus, fAgent, q]);

  // สรุปตามสถานะ (ของช่วงที่เลือก)
  const byStatus = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of deals) { if (pendingOnly && !isPending(d.status)) continue; const k = d.status || "(ไม่ระบุ)"; m[k] = (m[k] || 0) + 1; }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [deals, pendingOnly]);
  const maxSt = byStatus[0]?.[1] || 1;

  const selStyle = { border: "1px solid #E2E8F0", borderRadius: 9, padding: "8px 12px", fontSize: 13.5, background: "#fff", cursor: "pointer" } as const;
  const rangeText = picked.length ? (picked.length === 1 ? mkLabel(picked[0]) : `${mkLabel(picked[0])} – ${mkLabel(picked[picked.length - 1])}`) : "";

  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "ติดตามงานค้าง"]} title="ติดตามงานค้าง · Follow-up" />
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: -4 }}>
          <div style={{ fontSize: 12.5, color: "#94A3B8" }}>เคสที่ยังไม่ปิด เรียงตามค้างนานสุด — ไว้ตามงาน · {rangeText}</div>
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

        {err && <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#B45309", display: "flex", gap: 8, alignItems: "center" }}><AlertCircle size={14} /> {err}</div>}

        {/* สรุปตามสถานะ — กดกรอง */}
        {byStatus.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 12 }}>งานค้างแยกตามสถานะ</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {byStatus.map(([st, n]) => {
                const active = fStatus === st;
                return (
                  <button key={st} onClick={() => setFStatus(active ? "" : st)} style={{ textAlign: "left", background: active ? "#F8FAFC" : "transparent", border: active ? "1px solid #E2E8F0" : "1px solid transparent", borderRadius: 9, padding: "6px 8px", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 600, overflow: "hidden" }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: statusStyle(st).c, flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st}</span>
                      </span>
                      <b style={{ flexShrink: 0 }}>{n}</b>
                    </div>
                    <div style={{ height: 7, background: "#F1F5F9", borderRadius: 999 }}>
                      <div style={{ width: `${Math.max((n / maxSt) * 100, 3)}%`, height: "100%", background: statusStyle(st).c, borderRadius: 999 }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* filters */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={15} color="#94A3B8" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา ลูกค้า/เบอร์/เลขเคส/เซลล์"
                   style={{ ...selStyle, width: "100%", paddingLeft: 33, cursor: "text" }} />
          </div>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={selStyle}><option value="">ทุกสถานะ</option>{statusOpts.map(s => <option key={s} value={s}>{s}</option>)}</select>
          <select value={fAgent} onChange={e => setFAgent(e.target.value)} style={selStyle}><option value="">ทุกเซลล์</option>{agentOpts.map(a => <option key={a} value={a}>{a}</option>)}</select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", cursor: "pointer" }}>
            <input type="checkbox" checked={pendingOnly} onChange={e => setPendingOnly(e.target.checked)} /> เฉพาะงานค้าง
          </label>
        </div>

        <div style={{ fontSize: 13, color: "#64748B" }}>พบ <b style={{ color: "#0F172A" }}>{result.length}</b> เคส</div>

        {/* table */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ maxHeight: "calc(100vh - 360px)", overflow: "auto" }}>
            <table className="dtable" style={{ width: "100%", minWidth: 860, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 11.5, color: "#94A3B8" }}>
                  {["ค้าง (วัน)", "เลขที่เคส", "ลูกค้า", "เบอร์", "เซลล์", "ธนาคารเดิม", "สถานะ", "ยอดปิด", "เดือน"].map(h => (
                    <th key={h} style={{ padding: "12px 14px", fontWeight: 700, borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#94A3B8" }}>กำลังโหลด…</td></tr>
                ) : result.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#94A3B8" }}>ไม่มีงานค้างในช่วงนี้ 🎉</td></tr>
                ) : result.map((d, i) => (
                  <tr key={`${d._month}-${d.caseId}-${i}`} onClick={() => setSel(d)} style={{ cursor: "pointer" }}>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700, color: ageColor(d._age) }}>
                        <Clock size={13} /> {d._age == null ? "—" : d._age}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#2563EB", whiteSpace: "nowrap" }}>{d.caseId}</td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{d.customerName || "—"}</td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "#475569" }}>{d.customerPhone || "—"}</td>
                    <td style={{ padding: "10px 14px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.agent}>{d.agent || "—"}</td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{d.bank || "—"}</td>
                    <td style={{ padding: "10px 14px" }}><Pill text={d.status} /></td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{d.closeAmount ? fmtFull(d.closeAmount) : "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#94A3B8", whiteSpace: "nowrap" }}>{mkLabel(d._month || "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {sel && <Detail deal={sel} onClose={() => setSel(null)} />}
    </>
  );
}

function Detail({ deal: d, onClose }: { deal: Deal & { _age?: number | null }; onClose: () => void }) {
  const age = daysPending(d);
  const ms = Object.entries(d.milestones || {}).sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime());
  const Item = ({ label, value }: { label: string; value: string }) => (
    <div><div style={{ fontSize: 11, color: "#94A3B8" }}>{label}</div><div style={{ fontSize: 13, fontWeight: 600, marginTop: 1 }}>{value || "—"}</div></div>
  );
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 80, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 640, background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.3)", margin: "24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#2563EB" }}>{d.caseId}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{d.customerName}</span>
            <Pill text={d.status} />
          </div>
          <button onClick={onClose} aria-label="ปิด" style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={17} color="#64748B" /></button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* แถบตามงาน */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 150, background: age != null && age >= 14 ? "#FEF2F2" : "#F8FAFC", borderRadius: 12, padding: "11px 16px" }}>
              <div style={{ fontSize: 11.5, color: ageColor(age), fontWeight: 600 }}>ค้างมาแล้ว</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: ageColor(age) }}>{age == null ? "—" : `${age} วัน`}</div>
            </div>
            <a href={d.customerPhone ? `tel:${d.customerPhone}` : undefined} style={{ flex: 1, minWidth: 150, background: "#EFF6FF", borderRadius: 12, padding: "11px 16px", textDecoration: "none", color: "inherit" }}>
              <div style={{ fontSize: 11.5, color: "#2563EB", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><Phone size={12} /> โทรลูกค้า</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#1E3A8A" }}>{d.customerPhone || "—"}</div>
            </a>
          </div>

          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px 16px" }}>
            <Item label="เซลล์ผู้ดูแล" value={d.agent} />
            <Item label="เบอร์เซลล์" value={d.agentPhone} />
            <Item label="ธนาคารเดิม" value={d.bank} />
            <Item label="ประเภทงาน" value={d.dealType} />
            <Item label="วันติดต่อ" value={d.contactDate ? new Date(d.contactDate).toLocaleDateString("th-TH", { dateStyle: "medium" }) : ""} />
            <Item label="ยอดปิด" value={d.closeAmount ? fmtFull(d.closeAmount) : ""} />
          </div>

          {ms.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>ไทม์ไลน์</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {ms.map(([label, date]) => (
                  <div key={label} style={{ display: "flex", gap: 10, fontSize: 12.5 }}>
                    <span style={{ color: "#94A3B8", minWidth: 90 }}>{new Date(date).toLocaleDateString("th-TH", { dateStyle: "medium" })}</span>
                    <span style={{ color: "#475569" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.note && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}><User size={12} /> หมายเหตุ</div>
              <div style={{ fontSize: 12.5, color: "#475569", background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap" }}>{d.note}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
