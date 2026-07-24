"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Send, Users, XCircle, ListChecks } from "lucide-react";
import Link from "next/link";

// ชุดสี categorical ผ่าน validator (worst CVD ΔE 8.6) — ชุดเดียวกับ StatusDonut
const PALETTE = ["#2563EB", "#D97706", "#7C3AED", "#059669", "#DC2626", "#0891B2", "#DB2777"];
const GREY = "#94A3B8";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
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
  const router = useRouter();
  const [data, setData] = useState<ApiRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [breakMonth, setBreakMonth] = useState("");   // "" = รวมทุกเดือน
  const [donutHover, setDonutHover] = useState(false); // hover โดนัท → ซ่อนเลขกลางกัน tooltip ทับ

  useEffect(() => {
    fetch("/api/sales")
      .then(r => r.json())
      .then(d => { if (d.error) setErr(d.error); else setData(d); })
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

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
  const breakMonths = Array.from(new Set([
    ...Object.keys(agg.byLeasingMonth || {}),
    ...Object.keys(agg.byAgentMonth || {}),
    ...Object.keys(agg.byReasonMonth || {}),
  ])).sort((a, b) => { const [ay, am] = a.split("-").map(Number), [by, bm] = b.split("-").map(Number); return by - ay || bm - am; });
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
  // สีต่อหมวด (อื่นๆ = เทา, ที่เหลือไล่ตาม palette)
  let ci = 0;
  const reasonData = reasons.map(([name, value]) => ({
    name, value, color: name.startsWith("อื่นๆ") ? GREY : PALETTE[ci++ % PALETTE.length],
  }));

  // คลิกกลุ่ม → ไปหน้ารายการส่งเคส กรองกลุ่มนั้น (พร้อมเดือนที่เลือก)
  const goCase = (params: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (breakMonth) sp.set("month", breakMonth);
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    router.push(`/sales/cases?${sp.toString()}`);
  };

  return (
    <Shell>
      <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: -4, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span>การส่งงานของทีมเซลให้ลีสซิ่ง — ผลอนุมัติ/รอ/ไม่ผ่าน + เหตุผลที่ไม่อนุมัติ (คนละชุดกับยอดปิดส่วนกลาง)
          {data?.updatedAt && ` · อัปเดต ${new Date(data.updatedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}`}</span>
        <Link href="/sales/cases" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>
          <ListChecks size={14} /> ดูรายการส่งเคสรายตัว →
        </Link>
      </div>

      {/* KPI */}
      <div className="grid-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
        <Card icon={<Send size={17} color={C_SEND} />} label="เคสส่งงาน" value={nf(agg.totalLeads)} sub={`ส่งลีสซิ่งรวม ${nf(leasingSum.count)} ครั้ง`} />
        <Card icon={<Users size={17} color="#2563EB" />} label="อนุมัติ" value={nf(agentSum.approved)} sub="ในชีตงานเซล" />
        <Card icon={<Users size={17} color="#D97706" />} label="รออนุมัติ" value={nf(agentSum.pending)} />
        <Card icon={<XCircle size={17} color="#DC2626" />} label="ไม่อนุมัติ" value={nf(agentSum.rejected)} sub="ดูเหตุผลด้านล่าง" />
      </div>

      {/* ตัวเลือกเดือน */}
      {breakMonths.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>เลือกดูรายเดือน (ลีสซิ่ง / คนส่งงาน / เหตุผลไม่อนุมัติ):</span>
          <select value={breakMonth} onChange={e => setBreakMonth(e.target.value)}
            style={{ border: "1px solid #E2E8F0", borderRadius: 9, padding: "7px 12px", fontSize: 13, background: "#fff", cursor: "pointer" }}>
            <option value="">รวมทุกเดือน</option>
            {breakMonths.map(mk => <option key={mk} value={mk}>{monthLabel(mk)}</option>)}
          </select>
        </div>
      )}

      <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Panel title="ส่งลีสซิ่งแต่ละเจ้า" note="จำนวนเคสที่ส่ง (1 เคสส่งหลายเจ้า = นับทุกเจ้า) · กดเพื่อดูรายเคส">
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {leasing.map(([name, v]) => (
              <div key={name} onClick={() => goCase({ leasing: name })} title={`ดูรายเคสที่ส่ง ${name}`}
                style={{ cursor: "pointer" }}>
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

        {/* เหตุผลที่ไม่อนุมัติ (donut) — อยู่ขวาคู่กับส่งลีสซิ่ง */}
        <Panel
          title={`เหตุผลที่ไม่อนุมัติ${breakMonth ? ` · ${monthLabel(breakMonth)}` : " · รวมทุกเดือน"}`}
          note={`เคสไม่ผ่านทั้งหมด ${nf(reasonTotal)} เคส — จัดหมวดจากหมายเหตุการติดตาม · กดดูรายเคส`}
        >
          {reasonData.length ? (
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              {/* donut */}
              <div onMouseEnter={() => setDonutHover(true)} onMouseLeave={() => setDonutHover(false)}
                style={{ position: "relative", width: 190, height: 190, flexShrink: 0 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={reasonData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={54} outerRadius={88} paddingAngle={1.5} stroke="#fff" strokeWidth={2}
                      onClick={(d: { name?: string }) => d?.name && goCase({ reason: d.name })} style={{ cursor: "pointer" }}>
                      {reasonData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12.5, boxShadow: "0 4px 14px rgba(15,23,42,.08)" }}
                      formatter={(v, n) => { const num = Number(v); return [`${nf(num)} เคส · ${reasonTotal ? Math.round((num / reasonTotal) * 100) : 0}%`, String(n)]; }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none", opacity: donutHover ? 0 : 1, transition: "opacity 0.12s" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{nf(reasonTotal)}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>เคสไม่ผ่าน</div>
                </div>
              </div>
              {/* legend */}
              <div style={{ flex: "1 1 200px", minWidth: 200, display: "flex", flexDirection: "column", gap: 8 }}>
                {reasonData.map((d) => (
                  <div key={d.name} onClick={() => goCase({ reason: d.name })} title={`ดูรายเคส: ${d.name}`}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                    <span style={{ color: "#64748B", whiteSpace: "nowrap" }}>{nf(d.value)} · {reasonTotal ? Math.round((d.value / reasonTotal) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "#94A3B8" }}>ไม่มีเคสไม่อนุมัติในช่วงที่เลือก 🎉</div>
          )}
        </Panel>
      </div>

      {/* คนส่งงาน — เต็มความกว้าง ด้านล่าง */}
      <Panel title="คนส่งงาน" note="ทีมเซล — จำนวนเคสและผลอนุมัติ · กดแถวเพื่อดูรายเคส">
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
              <tr key={name} onClick={() => goCase({ agent: name })} title={`ดูรายเคสของ ${name}`} style={{ cursor: "pointer" }}>
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
    </Shell>
  );
}
