"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, UserMinus, TrendingUp, Download, Settings, AlertCircle, CheckCircle2, Clock } from "lucide-react";

// สีผ่าน validator (CVD ΔE 32.3 — แยกออกแม้ตาบอดสี)
const C_FOLLOW = "#2563EB";
const C_BLOCK  = "#D97706";

interface DayStat { followers: number; reach: number; blocks: number }
interface StatDoc { id: string; name: string; platform: string; updatedAt: string | null; daily: Record<string, DayStat> }
interface Source { id: string; platform: string; name: string; hasToken: boolean; enabled: boolean }
interface InboundDoc { id: string; total: number; updatedAt: string | null; byHour: Record<string, number>; byDate: Record<string, number> }

const nf = (v: number) => Math.round(v || 0).toLocaleString("th-TH");

function Card({ icon, label, value, sub, tone }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "good" | "bad";
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-0.02em", color: tone === "bad" ? "#DC2626" : tone === "good" ? "#059669" : "#0F172A" }}>{value}</div>
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

export default function AdsReportPage() {
  const [stats, setStats] = useState<StatDoc[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [inbound, setInbound] = useState<InboundDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/adsources/sync").then(r => r.json()).catch(() => ({})),
      fetch("/api/adsources").then(r => r.json()).catch(() => ({})),
      fetch("/api/inbound").then(r => r.json()).catch(() => ({})),
    ]).then(([st, sr, ib]) => {
      if (!st.error) setStats(st.stats || []);
      if (!sr.error) setSources(sr.sources || []);
      if (!ib.error) setInbound(ib.stats || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const runSync = async (id: string) => {
    setSyncing(id); setMsg(null);
    try {
      const r = await fetch("/api/adsources/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, days: 30 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `error ${r.status}`);
      setMsg({ kind: "ok", text: `ดึงข้อมูล "${d.name}" แล้ว +${d.added} วัน (รวม ${d.totalDays} วัน)${d.note ? ` · ${d.note}` : ""}` });
      load();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally { setSyncing(null); }
  };

  const withData = stats.filter(s => Object.keys(s.daily || {}).length > 0);
  // บัญชี LINE ที่มี token แต่ยังไม่เคยดึงข้อมูล
  const pending = sources.filter(s =>
    s.platform === "line" && s.hasToken && !withData.some(w => w.id === s.id));

  // รวมทุก OA (ค่าล่าสุดของแต่ละบัญชี)
  const totals = withData.reduce((acc, s) => {
    const days = Object.keys(s.daily).sort();
    const last = s.daily[days[days.length - 1]];
    const first = s.daily[days[0]];
    return {
      followers: acc.followers + (last?.followers || 0),
      blocks: acc.blocks + (last?.blocks || 0),
      growth: acc.growth + ((last?.followers || 0) - (first?.followers || 0)),
    };
  }, { followers: 0, blocks: 0, growth: 0 });

  // ── เวลาที่ลูกค้าทักครั้งแรก (รวมทุก OA) ──
  const inHours = Array.from({ length: 24 }, (_, h) => {
    const count = inbound.reduce((s, d) => s + (d.byHour?.[String(h)] || 0), 0);
    return { hour: h, label: `${String(h).padStart(2, "0")}:00`, จำนวน: count };
  });
  const inTotal = inbound.reduce((s, d) => s + (d.total || 0), 0);
  const peak = inTotal ? inHours.reduce((a, b) => (b.จำนวน > a.จำนวน ? b : a)) : null;
  const inUpdated = inbound.map(d => d.updatedAt).filter(Boolean).sort().pop() || null;

  return (
    <>
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: -4 }}>
          สถิติจริงจากแพลตฟอร์มโฆษณา — ตั้งค่าบัญชีได้ที่{" "}
          <Link href="/ads" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 600 }}>บัญชีโฆษณา</Link>
        </div>

        {msg && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "10px 14px", borderRadius: 10,
            background: msg.kind === "ok" ? "#F0FDF4" : "#FFFBEB",
            border: `1px solid ${msg.kind === "ok" ? "#BBF7D0" : "#FDE68A"}`,
            color: msg.kind === "ok" ? "#166534" : "#B45309",
          }}>
            {msg.kind === "ok" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {msg.text}
          </div>
        )}

        {loading ? (
          <div style={{ fontSize: 13, color: "#94A3B8" }}>กำลังโหลดรายงาน…</div>
        ) : !withData.length ? (
          // ── ยังไม่มีข้อมูล: บอกให้ชัดว่าต้องทำอะไร ──
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "32px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 6 }}>ยังไม่มีข้อมูลรายงาน</div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 18 }}>
              {pending.length
                ? "กดปุ่มด้านล่างเพื่อดึงสถิติย้อนหลัง 30 วันจาก LINE เข้ามาเก็บครั้งแรก"
                : sources.length
                  ? "ยังไม่มีบัญชีที่ใส่ token — ไปใส่ token ที่หน้าบัญชีโฆษณาก่อน"
                  : "ยังไม่ได้ลงทะเบียนบัญชีโฆษณา"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {pending.map(s => (
                <button key={s.id} onClick={() => runSync(s.id)} disabled={syncing === s.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 7, border: "none", borderRadius: 9,
                  background: syncing === s.id ? "#93C5FD" : "#2563EB", color: "#fff", fontSize: 13.5,
                  fontWeight: 600, padding: "10px 18px", cursor: syncing === s.id ? "default" : "pointer",
                }}>
                  <Download size={15} /> {syncing === s.id ? "กำลังดึง…" : `ดึงข้อมูล ${s.name} (30 วัน)`}
                </button>
              ))}
              {!pending.length && (
                <Link href="/ads" style={{
                  display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 9, textDecoration: "none",
                  background: "#2563EB", color: "#fff", fontSize: 13.5, fontWeight: 600, padding: "10px 18px",
                }}>
                  <Settings size={15} /> ไปหน้าบัญชีโฆษณา
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* สรุปรวม */}
            <div className="grid-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
              <Card icon={<Users size={17} color={C_FOLLOW} />} label="ผู้ติดตามรวม" value={nf(totals.followers)}
                    sub={`${withData.length} บัญชี`} />
              <Card icon={<TrendingUp size={17} color={totals.growth >= 0 ? "#059669" : "#DC2626"} />} label="เปลี่ยนแปลง (ช่วงที่เก็บ)"
                    value={`${totals.growth >= 0 ? "+" : ""}${nf(totals.growth)}`} tone={totals.growth >= 0 ? "good" : "bad"} />
              <Card icon={<UserMinus size={17} color={C_BLOCK} />} label="บล็อกรวม" value={nf(totals.blocks)} />
            </div>

            {/* กราฟรายบัญชี */}
            {withData.map(s => {
              const rows = Object.entries(s.daily)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([d, v]) => ({
                  label: `${d.slice(6, 8)}/${d.slice(4, 6)}`,
                  "ผู้ติดตาม": v.followers,
                  "บล็อก": v.blocks,
                }));
              const growth = rows.length ? rows[rows.length - 1]["ผู้ติดตาม"] - rows[0]["ผู้ติดตาม"] : 0;
              return (
                <Panel key={s.id} title={`ผู้ติดตามรายวัน — ${s.name}`}
                       note={`${rows.length} วัน · เปลี่ยนแปลง ${growth >= 0 ? "+" : ""}${nf(growth)} คน${s.updatedAt ? ` · ดึงล่าสุด ${new Date(s.updatedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}` : ""}`}>
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <LineChart data={rows} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11.5, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} minTickGap={18} />
                        <YAxis tick={{ fontSize: 11.5, fill: "#64748B" }} axisLine={false} tickLine={false} width={52}
                               tickFormatter={(v) => nf(Number(v))} />
                        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12.5 }}
                                 formatter={(v) => nf(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 12.5, paddingTop: 6 }} />
                        <Line type="monotone" dataKey="ผู้ติดตาม" stroke={C_FOLLOW} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="บล็อก" stroke={C_BLOCK} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button onClick={() => runSync(s.id)} disabled={syncing === s.id} style={{
                      display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #E2E8F0",
                      background: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 12.5,
                      color: "#2563EB", cursor: syncing === s.id ? "default" : "pointer",
                    }}>
                      <Download size={13} /> {syncing === s.id ? "กำลังดึง…" : "อัปเดตข้อมูล"}
                    </button>
                  </div>
                </Panel>
              );
            })}

            {/* บัญชีที่ยังไม่เคยดึง */}
            {pending.length > 0 && (
              <Panel title="บัญชีที่ยังไม่มีข้อมูล">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {pending.map(s => (
                    <button key={s.id} onClick={() => runSync(s.id)} disabled={syncing === s.id} style={{
                      display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #E2E8F0",
                      background: "#fff", borderRadius: 9, padding: "8px 14px", fontSize: 13,
                      cursor: syncing === s.id ? "default" : "pointer",
                    }}>
                      <Download size={14} /> {syncing === s.id ? "กำลังดึง…" : `ดึง ${s.name}`}
                    </button>
                  ))}
                </div>
              </Panel>
            )}
          </>
        )}

        {/* เวลาที่ลูกค้าทักครั้งแรก — แยกจากผู้ติดตาม (คนละเมตริก) */}
        {inTotal > 0 && (
          <Panel title="เวลาที่ลูกค้าทักเข้ามาครั้งแรก"
                 note={`นับครั้งแรกของลูกค้าแต่ละคน · รวม ${nf(inTotal)} คน${peak ? ` · ทักเยอะสุดช่วง ${peak.label}` : ""}${inUpdated ? ` · อัปเดต ${new Date(inUpdated).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}` : ""}`}>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={inHours} margin={{ top: 6, right: 10, left: 0, bottom: 0 }} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 11.5, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12.5 }}
                           formatter={(v) => `${nf(Number(v))} คน`} labelFormatter={(l) => `ช่วง ${l}`} />
                  <Bar dataKey="จำนวน" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 10, fontSize: 11.5, color: "#94A3B8" }}>
              💡 ช่วงที่ลูกค้าทักเยอะ = ควรจัดคนเฝ้าแชทให้พอ · ข้อมูลนี้ไม่เก็บชื่อ/ข้อความ เก็บแค่เวลา
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
