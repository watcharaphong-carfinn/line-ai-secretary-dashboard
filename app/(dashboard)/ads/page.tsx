"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Trash2, KeyRound, CheckCircle2, AlertCircle, RefreshCw, PlugZap, Download, BarChart3, Copy, Pencil, X } from "lucide-react";

// URL ของบอท (สาธารณะ ไม่ลับ) — webhook "เวลาทักครั้งแรก" ยิงเข้าบอท ไม่ใช่แดชบอร์ด
const BOT_URL = "https://line-ai-secretary-560617243929.asia-southeast3.run.app";
const webhookUrl = (id: string) => `${BOT_URL}/webhook/inbound/${encodeURIComponent(id)}`;

interface TestResult {
  ok: boolean; name?: string; error?: string;
  bot?: { displayName?: string; basicId?: string; chatMode?: string; premiumId?: string | null };
  followers?: { status?: string; followers?: number; targetedReaches?: number; blocks?: number } | null;
  followersNote?: string;
}

// แพลตฟอร์มที่เปิดใช้ตอนนี้ (Facebook รอรวม Business Manager ก่อน)
const PLATFORMS = [
  { id: "line",   label: "LINE OA",  hint: "1 token ต่อ 1 OA (แต่ละ OA มี Channel access token ของตัวเอง)" },
  { id: "tiktok", label: "TikTok",   hint: "ใช้ Business Center token ครอบได้หลาย advertiser" },
] as const;

interface AdSource {
  id: string; platform: string; accountId: string; name: string;
  group?: string; enabled: boolean; hasToken: boolean; hasChannelSecret?: boolean;
  addedBy?: string; addedAt?: string; lastSyncAt?: string; lastError?: string;
}

function Panel({ title, note, right, children }: {
  title: string; note?: string; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: note ? 2 : 14 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>{title}</div>
        {right}
      </div>
      {note && <div style={{ fontSize: 11.5, color: "#94A3B8", marginBottom: 14 }}>{note}</div>}
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #E2E8F0", borderRadius: 9, padding: "8px 11px",
  fontSize: 13.5, background: "#fff", width: "100%",
};

export default function AdsPage() {
  const [sources, setSources] = useState<AdSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ platform: "line", accountId: "", name: "", group: "", token: "", channelSecret: "" });
  const [editing, setEditing] = useState<AdSource | null>(null);

  const startEdit = (s: AdSource) => {
    setEditing(s);
    setForm({ platform: s.platform, accountId: s.accountId, name: s.name, group: s.group || "", token: "", channelSecret: "" });
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => {
    setEditing(null);
    setForm({ platform: "line", accountId: "", name: "", group: "", token: "", channelSecret: "" });
  };
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [syncing, setSyncing] = useState<string | null>(null);

  const runSync = async (id: string) => {
    setSyncing(id); setMsg(null);
    try {
      const r = await fetch("/api/adsources/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, days: 30 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `error ${r.status}`);
      setMsg({ kind: "ok", text: `ดึงข้อมูล "${d.name}" แล้ว +${d.added} วัน (มีทั้งหมด ${d.totalDays} วัน) — ดูกราฟที่หน้ารายงานโฆษณา` });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally { setSyncing(null); }
  };

  const runTest = async (id: string) => {
    setTesting(id);
    try {
      const r = await fetch("/api/adsources/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d: TestResult = await r.json();
      setResults(prev => ({ ...prev, [id]: d }));
      load();   // อัปเดตคอลัมน์ sync ล่าสุด
    } catch (e) {
      setResults(prev => ({ ...prev, [id]: { ok: false, error: e instanceof Error ? e.message : String(e) } }));
    } finally { setTesting(null); }
  };

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/adsources")
      .then(r => r.json())
      .then(d => { if (d.error) setMsg({ kind: "err", text: d.error }); else setSources(d.sources || []); })
      .catch(e => setMsg({ kind: "err", text: String(e) }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.accountId.trim() || !form.name.trim()) {
      setMsg({ kind: "err", text: "กรอก Account ID และชื่อบัญชีก่อนค่ะ" });
      return;
    }
    setSaving(true); setMsg(null);
    try {
      const r = await fetch("/api/adsources", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `error ${r.status}`);
      setMsg({ kind: "ok", text: `บันทึก "${form.name}" แล้ว` });
      setForm({ platform: form.platform, accountId: "", name: "", group: "", token: "", channelSecret: "" });
      setEditing(null);
      load();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally { setSaving(false); }
  };

  const remove = async (s: AdSource) => {
    if (!confirm(`ลบบัญชี "${s.name}" ออกจากทะเบียน?`)) return;
    try {
      const r = await fetch(`/api/adsources?id=${encodeURIComponent(s.id)}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `error ${r.status}`);
      setMsg({ kind: "ok", text: `ลบ "${s.name}" แล้ว` });
      load();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    }
  };

  const byPlatform = (p: string) => sources.filter(s => s.platform === p);

  return (
    <>
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: -4 }}>
          <div style={{ fontSize: 12.5, color: "#94A3B8" }}>
            หน้านี้ใช้ <b>ตั้งค่าบัญชี</b> เท่านั้น — กราฟและสถิติดูที่หน้ารายงานโฆษณา
          </div>
          <Link href="/ads/report" style={{
            display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 9, textDecoration: "none",
            border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#1E40AF",
            fontSize: 13, fontWeight: 600, padding: "8px 14px",
          }}>
            <BarChart3 size={15} /> ดูรายงานโฆษณา
          </Link>
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

        <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, fontSize: 12.5, color: "#1E40AF" }}>
          <b>สถานะ:</b> ตอนนี้เป็นขั้น &quot;ลงทะเบียนบัญชี&quot; — ใส่บัญชีและ token ไว้ก่อน
          ส่วนการดึงตัวเลขจริงจาก LINE/TikTok จะเปิดใช้ในขั้นถัดไป (Facebook รอรวม Business Manager)
        </div>

        {/* เพิ่มบัญชี */}
        <Panel title={editing ? `แก้ไขบัญชี: ${editing.name}` : "เพิ่มบัญชีใหม่"}
               note={editing ? "แก้เฉพาะช่องที่ต้องการ · เว้น Token/Channel secret ว่าง = ไม่ทับของเดิม" : "เว้น token/secret ว่างได้ ใส่ทีหลังก็ได้"}>
          {editing && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 12px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 9, fontSize: 12.5, color: "#1E40AF" }}>
              <Pencil size={13} /> กำลังแก้ไข <b>{editing.name}</b> ({editing.accountId})
              <button onClick={cancelEdit} style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", color: "#1E40AF", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                <X size={13} /> ยกเลิก
              </button>
            </div>
          )}
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#64748B" }}>
              แพลตฟอร์ม
              <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} disabled={!!editing} style={{ ...inputStyle, marginTop: 5, cursor: editing ? "not-allowed" : "pointer", opacity: editing ? 0.6 : 1 }}>
                {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, color: "#64748B" }}>
              Account ID
              <input value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} disabled={!!editing}
                     placeholder={form.platform === "line" ? "เช่น @carfinn" : "เช่น 690123456789"} style={{ ...inputStyle, marginTop: 5, opacity: editing ? 0.6 : 1 }} />
            </label>
            <label style={{ fontSize: 12, color: "#64748B" }}>
              ชื่อที่เรียก
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                     placeholder="เช่น Carfinn รีไฟแนนซ์" style={{ ...inputStyle, marginTop: 5 }} />
            </label>
          </div>
          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#64748B" }}>
              กลุ่ม (ไม่บังคับ)
              <input value={form.group} onChange={e => setForm({ ...form, group: e.target.value })}
                     placeholder="เช่น รีไฟแนนซ์" style={{ ...inputStyle, marginTop: 5 }} />
            </label>
            <label style={{ fontSize: 12, color: "#64748B" }}>
              Token / Access key <span style={{ color: "#94A3B8" }}>(เก็บเป็นความลับ ไม่แสดงซ้ำ)</span>
              <input value={form.token} onChange={e => setForm({ ...form, token: e.target.value })}
                     type="password" autoComplete="new-password" placeholder="วาง token ที่นี่" style={{ ...inputStyle, marginTop: 5 }} />
            </label>
          </div>
          {form.platform === "line" && (
            <label style={{ fontSize: 12, color: "#64748B", display: "block", marginBottom: 14 }}>
              Channel secret <span style={{ color: "#94A3B8" }}>(ไม่บังคับ · ใช้ยืนยัน webhook &quot;เวลาทักครั้งแรก&quot; · เว้นว่าง = ไม่ทับของเดิม)</span>
              <input value={form.channelSecret} onChange={e => setForm({ ...form, channelSecret: e.target.value })}
                     type="password" autoComplete="new-password" placeholder="วาง Channel secret จาก LINE Developers" style={{ ...inputStyle, marginTop: 5 }} />
            </label>
          )}
          <div style={{ fontSize: 11.5, color: "#94A3B8", marginBottom: 12 }}>
            💡 {PLATFORMS.find(p => p.id === form.platform)?.hint}
          </div>
          <button onClick={save} disabled={saving} style={{
            display: "inline-flex", alignItems: "center", gap: 7, border: "none", borderRadius: 9,
            background: saving ? "#93C5FD" : "#2563EB", color: "#fff", fontSize: 13.5, fontWeight: 600,
            padding: "9px 16px", cursor: saving ? "default" : "pointer",
          }}>
            <Plus size={15} /> {saving ? "กำลังบันทึก…" : editing ? "อัปเดตบัญชี" : "บันทึกบัญชี"}
          </button>
        </Panel>

        {/* รายการ */}
        {PLATFORMS.map(p => {
          const list = byPlatform(p.id);
          return (
            <Panel key={p.id} title={`${p.label} — ${list.length} บัญชี`}
                   right={<button onClick={load} title="โหลดใหม่" style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "5px 9px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748B" }}>
                     <RefreshCw size={13} /> รีเฟรช
                   </button>}>
              {loading ? (
                <div style={{ fontSize: 12.5, color: "#94A3B8" }}>กำลังโหลด…</div>
              ) : !list.length ? (
                <div style={{ fontSize: 12.5, color: "#94A3B8" }}>ยังไม่มีบัญชี {p.label} ในทะเบียน</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="dtable" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 620 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#64748B" }}>
                        {["ชื่อ", "Account ID", "กลุ่ม", "Token", "สถานะ", "sync ล่าสุด", ""].map(h => (
                          <th key={h} style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {list.map(s => (
                        <tr key={s.id}>
                          <td style={{ padding: "9px 10px", fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: "9px 10px", color: "#64748B", whiteSpace: "nowrap" }}>{s.accountId}</td>
                          <td style={{ padding: "9px 10px", color: "#64748B" }}>{s.group || "-"}</td>
                          <td style={{ padding: "9px 10px" }}>
                            {s.hasToken
                              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#059669" }}><KeyRound size={13} /> มีแล้ว</span>
                              : <span style={{ color: "#D97706" }}>ยังไม่ใส่</span>}
                          </td>
                          <td style={{ padding: "9px 10px" }}>
                            {s.enabled ? <span style={{ color: "#059669" }}>เปิดใช้</span> : <span style={{ color: "#94A3B8" }}>ปิด</span>}
                          </td>
                          <td style={{ padding: "9px 10px", color: s.lastError ? "#DC2626" : "#64748B", whiteSpace: "nowrap" }}>
                            {s.lastError ? `ผิดพลาด: ${s.lastError.slice(0, 40)}` : (s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "ยังไม่เคย")}
                          </td>
                          <td style={{ padding: "9px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                            <button onClick={() => startEdit(s)} title="แก้ไข"
                                    style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "5px 9px",
                                             cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569", marginRight: 6 }}>
                              <Pencil size={13} /> แก้ไข
                            </button>
                            <button onClick={() => runTest(s.id)} disabled={testing === s.id} title="ทดสอบการเชื่อมต่อ"
                                    style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "5px 9px",
                                             cursor: testing === s.id ? "default" : "pointer", display: "inline-flex", alignItems: "center",
                                             gap: 5, fontSize: 12, color: "#2563EB", marginRight: 6 }}>
                              <PlugZap size={13} /> {testing === s.id ? "กำลังทดสอบ…" : "ทดสอบ"}
                            </button>
                            {s.platform === "line" && (
                              <button onClick={() => runSync(s.id)} disabled={syncing === s.id} title="ดึงสถิติย้อนหลัง 30 วัน"
                                      style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "5px 9px",
                                               cursor: syncing === s.id ? "default" : "pointer", display: "inline-flex", alignItems: "center",
                                               gap: 5, fontSize: 12, color: "#7C3AED", marginRight: 6 }}>
                                <Download size={13} /> {syncing === s.id ? "กำลังดึง…" : "ดึง 30 วัน"}
                              </button>
                            )}
                            <button onClick={() => remove(s)} title="ลบ" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#DC2626", display: "inline-flex", padding: 4, verticalAlign: "middle" }}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {list.filter(s => results[s.id]).map(s => {
                        const r = results[s.id];
                        return (
                          <tr key={`${s.id}-result`}>
                            <td colSpan={7} style={{ padding: "10px 12px", background: r.ok ? "#F0FDF4" : "#FEF2F2", borderTop: "1px solid #E2E8F0" }}>
                              {r.ok ? (
                                <div style={{ fontSize: 12.5, color: "#166534", display: "flex", flexDirection: "column", gap: 4 }}>
                                  <div><b>✅ {s.name} — เชื่อมต่อสำเร็จ</b></div>
                                  {r.bot && <div>OA: {r.bot.displayName} ({r.bot.basicId}) · โหมดแชท: {r.bot.chatMode}</div>}
                                  {r.followers?.status === "ready" ? (
                                    <div>ผู้ติดตาม {Number(r.followers.followers || 0).toLocaleString("th-TH")} · เข้าถึงได้ {Number(r.followers.targetedReaches || 0).toLocaleString("th-TH")} · บล็อก {Number(r.followers.blocks || 0).toLocaleString("th-TH")}</div>
                                  ) : (
                                    <div style={{ color: "#B45309" }}>สถิติ: {r.followersNote || r.followers?.status || "ไม่มีข้อมูล"}</div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ fontSize: 12.5, color: "#B91C1C" }}>
                                  <b>❌ {s.name} — {r.error}</b>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Webhook "เวลาทักครั้งแรก" — เฉพาะ LINE */}
              {p.id === "line" && list.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed #E2E8F0" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Webhook — นับ &quot;เวลาลูกค้าทักครั้งแรก&quot;</div>
                  <div style={{ fontSize: 11.5, color: "#94A3B8", marginBottom: 12 }}>
                    ก๊อป URL ไปวางใน LINE Developers Console → Messaging API → Webhook URL แล้วเปิด &quot;Use webhook&quot;
                    · ระบบจะ log แค่เวลา ไม่ตอบลูกค้า
                  </div>
                  {list.map(s => (
                    <div key={`${s.id}-wh`} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, minWidth: 90 }}>{s.name}</span>
                      <code style={{ flex: 1, minWidth: 240, fontSize: 11.5, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 10px", overflowX: "auto", whiteSpace: "nowrap" }}>
                        {webhookUrl(s.id)}
                      </code>
                      <button onClick={() => { navigator.clipboard?.writeText(webhookUrl(s.id)); setMsg({ kind: "ok", text: `ก๊อป Webhook URL ของ ${s.name} แล้ว` }); }}
                              style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "6px 11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#2563EB" }}>
                        <Copy size={13} /> ก๊อป
                      </button>
                      <span style={{ fontSize: 11.5, color: s.hasChannelSecret ? "#059669" : "#D97706" }}>
                        {s.hasChannelSecret ? "🔒 verify แล้ว" : "⚠️ ยังไม่ใส่ secret"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
