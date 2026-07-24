"use client";
import { useEffect, useState } from "react";
import { Shield, AlertCircle, RefreshCw, Crown, Trash2, UserPlus, Pencil, X, Eye, Edit3, Trash, Copy, Mail } from "lucide-react";
import { SECTIONS, SECTION_LABELS, NO_PERMS, normalizePerms, type Perms, type Section } from "@/lib/sections";

import { MODULE_ROLES, type ModuleAccess } from "@/lib/modules";
interface UserRow { email: string; role: string; perms: Perms; modules: ModuleAccess; addedBy?: string; addedAt?: string; }
interface Resp { users: UserRow[]; superAdmin: string; warn?: string }

const emptyForm = () => ({ email: "", perms: NO_PERMS(), modules: {} as ModuleAccess });

export default function UsersPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [form, setForm] = useState<{ email: string; perms: Perms; modules: ModuleAccess }>(emptyForm());
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [invited, setInvited] = useState<string | null>(null);

  const DASH_URL = "https://internal.carfinn.com";
  const inviteText = (em: string) =>
    `คุณได้รับสิทธิ์เข้าใช้ CarFinn Portal แล้ว 🎉\n\nเข้าที่: ${DASH_URL}\nกด "Sign in with Google" แล้วเลือกอีเมล ${em}\n(ต้องเป็นอีเมล @carfinn.com เท่านั้น)`;
  const copyInvite = (em: string) => {
    navigator.clipboard?.writeText(inviteText(em));
    setMsg({ type: "ok", text: `คัดลอกข้อความเชิญของ ${em} แล้ว — เอาไปส่งทาง LINE/เมลได้เลย` });
  };

  const load = async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const [u, me] = await Promise.all([fetch("/api/users").then(r => r.json()), fetch("/api/auth/me").then(r => r.json())]);
      setData(u); setMyRole(me?.user?.role ?? null);
    } catch (e) {
      setData({ users: [], superAdmin: "", warn: e instanceof Error ? e.message : String(e) });
    } finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const isSuper = myRole === "super_admin";
  const users = data?.users || [];

  // แก้ไข/ลบ ต้องเปิด "ดู" อัตโนมัติ
  const setPerm = (sec: Section, key: "v" | "e" | "d", val: boolean) => {
    setForm(f => {
      const p = { ...f.perms, [sec]: { ...f.perms[sec], [key]: val } };
      if ((key === "e" || key === "d") && val) p[sec].v = true;
      if (key === "v" && !val) { p[sec].e = false; p[sec].d = false; }
      return { ...f, perms: p };
    });
  };
  const startEdit = (u: UserRow) => { setEditing(u.email); setForm({ email: "", perms: normalizePerms(u.perms), modules: { ...(u.modules || {}) } }); setMsg(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const cancel = () => { setEditing(null); setForm(emptyForm()); };

  const save = async () => {
    const email = editing || `${form.email.trim().toLowerCase()}@carfinn.com`;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, perms: form.perms, modules: form.modules }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      const mailTxt = editing ? "" : j.emailed === true ? " · ส่งอีเมลเชิญแล้ว ✉️" : j.emailed === false ? ` · ⚠️ ส่งอีเมลไม่สำเร็จ (${j.emailError || "ดูข้อความเชิญด้านล่าง"})` : " · (ยังไม่เปิดส่งอีเมลอัตโนมัติ)";
      setMsg({ type: "ok", text: `${editing ? "อัปเดตสิทธิ์" : "เพิ่ม"} ${j.email} แล้ว${mailTxt}` });
      if (!editing) setInvited(j.email);
      cancel(); await load(true);
    } catch (e) { setMsg({ type: "err", text: e instanceof Error ? e.message : String(e) }); }
    finally { setBusy(false); }
  };

  const delUser = async (em: string) => {
    if (!confirm(`ลบสิทธิ์ ${em}?`)) return;
    setMsg(null);
    try {
      const r = await fetch(`/api/users?email=${encodeURIComponent(em)}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setMsg({ type: "ok", text: `ลบ ${em} แล้ว` }); await load(true);
    } catch (e) { setMsg({ type: "err", text: e instanceof Error ? e.message : String(e) }); }
  };

  const chk: React.CSSProperties = { width: 16, height: 16, cursor: "pointer" };
  const anyView = SECTIONS.some(s => form.perms[s].v);
  // มีสิทธิ์อะไรสักอย่าง = บันทึกได้ (หัวข้อใน Dashboard หรือเข้าโมดูลใดก็ได้)
  const anyAccess = anyView || MODULE_ROLES.some(m => form.modules[m.id]);

  return (
    <>
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "14px 18px", fontSize: 13.5, color: "#1E40AF", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Shield size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          <div>เข้าระบบด้วย Google เฉพาะอีเมล <b>@carfinn.com</b> · <b>Super Admin</b> กำหนดได้ว่าใครเห็นหัวข้อไหน + ดู/แก้ไข/ลบ · เปลี่ยนสิทธิ์แล้วมีผลรอบ login ถัดไปของผู้ใช้คนนั้น</div>
        </div>

        {msg && (
          <div style={{ borderRadius: 10, padding: "10px 14px", fontSize: 13, display: "flex", gap: 8, alignItems: "center",
            background: msg.type === "ok" ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${msg.type === "ok" ? "#A7F3D0" : "#FECACA"}`, color: msg.type === "ok" ? "#059669" : "#DC2626" }}>
            {msg.type === "ok" ? "✅" : <AlertCircle size={14} />} {msg.text}
          </div>
        )}

        {/* กล่องเชิญ — หลังเพิ่มผู้ใช้ (ระบบยังไม่ส่งเมลอัตโนมัติ → ก๊อปข้อความไปส่งเอง) */}
        {invited && (
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13.5, color: "#166534" }}>
                <b>เพิ่ม {invited} แล้ว</b> — เขา login เองได้เลยด้วย Google<br />
                <span style={{ fontSize: 12.5, color: "#15803D" }}>ระบบยังไม่ส่งเมลอัตโนมัติ · ก๊อปข้อความเชิญไปส่งทาง LINE/เมลได้เลย</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => copyInvite(invited)} style={{ border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#059669", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Copy size={14} /> คัดลอกข้อความเชิญ
                </button>
                <button onClick={() => setInvited(null)} title="ปิด" style={{ border: "1px solid #BBF7D0", background: "#fff", borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: "#166534", display: "inline-flex" }}>
                  <X size={14} />
                </button>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "#166534", background: "#fff", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap", border: "1px solid #DCFCE7" }}>{inviteText(invited)}</div>
          </div>
        )}

        {/* add / edit (super admin) */}
        {isSuper && (
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700 }}>
                {editing ? <><Pencil size={17} color="#2563EB" /> แก้ไขสิทธิ์: {editing}</> : <><UserPlus size={17} color="#2563EB" /> เพิ่มผู้ใช้ + กำหนดสิทธิ์</>}
              </div>
              {editing && <button onClick={cancel} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748B", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5 }}><X size={14} /> ยกเลิก</button>}
            </div>

            {editing ? (
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 9, padding: "10px 13px", fontSize: 13.5, background: "#F8FAFC", color: "#64748B", marginBottom: 16 }}>{editing}</div>
            ) : (
              <div style={{ display: "flex", alignItems: "stretch", marginBottom: 16, border: "1px solid #E2E8F0", borderRadius: 9, overflow: "hidden" }}>
                <input value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value.split("@")[0].replace(/\s/g, "").toLowerCase() }))}
                  placeholder="ชื่อผู้ใช้ (เช่น somchai)" autoComplete="off"
                  style={{ flex: 1, border: "none", padding: "10px 13px", fontSize: 13.5, outline: "none" }} />
                <span style={{ display: "flex", alignItems: "center", padding: "0 14px", background: "#F1F5F9", color: "#475569", fontSize: 13.5, fontWeight: 600, borderLeft: "1px solid #E2E8F0" }}>@carfinn.com</span>
              </div>
            )}

            {/* ตารางสิทธิ์ */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 460, borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: "#94A3B8", textAlign: "left", fontSize: 11.5 }}>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>หัวข้อ</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Eye size={13} /> ดู</span></th>
                    <th style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Edit3 size={13} /> แก้ไข</span></th>
                    <th style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Trash size={13} /> ลบ</span></th>
                  </tr>
                </thead>
                <tbody>
                  {SECTIONS.map(sec => (
                    <tr key={sec} style={{ borderTop: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "10px 10px", fontWeight: 600 }}>{SECTION_LABELS[sec]}</td>
                      <td style={{ padding: "10px 10px", textAlign: "center" }}><input type="checkbox" style={chk} checked={form.perms[sec].v} onChange={e => setPerm(sec, "v", e.target.checked)} /></td>
                      <td style={{ padding: "10px 10px", textAlign: "center" }}><input type="checkbox" style={chk} checked={form.perms[sec].e} onChange={e => setPerm(sec, "e", e.target.checked)} /></td>
                      <td style={{ padding: "10px 10px", textAlign: "center" }}><input type="checkbox" style={chk} checked={form.perms[sec].d} onChange={e => setPerm(sec, "d", e.target.checked)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 8 }}>* ติ๊ก แก้ไข/ลบ จะเปิด &quot;ดู&quot; ให้อัตโนมัติ · หน้าส่วนใหญ่ตอนนี้ดูอย่างเดียว (แก้ไข/ลบ มีผลกับ จัดการผู้ใช้/บัญชีโฆษณา)</div>

            {/* สิทธิ์รายโมดูล — คุมการเข้าใช้ Agent / ราคารถ จากที่เดียว */}
            <div style={{ marginTop: 18, borderTop: "1px solid #F1F5F9", paddingTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>เข้าใช้โมดูล (เลือกได้ว่าเปิดแอปไหนได้บ้าง)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                {MODULE_ROLES.map(m => (
                  <label key={m.id} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5 }}>
                    <span style={{ color: "#475569", fontWeight: 600 }}>{m.label}</span>
                    <select
                      value={form.modules[m.id] || ""}
                      onChange={e => setForm(f => ({ ...f, modules: { ...f.modules, [m.id]: e.target.value } }))}
                      style={{ border: "1.4px solid #E2E8F0", borderRadius: 9, padding: "8px 11px", fontSize: 13, background: "#fff", minWidth: 190 }}
                    >
                      <option value="">— ไม่ให้เข้า —</option>
                      {m.roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 8 }}>* กำหนดที่นี่ที่เดียวทุกโมดูล — ไม่ต้องเพิ่มซ้ำในแต่ละแอป · ตารางติ๊กด้านบนคือรายละเอียดสิทธิ์ &quot;ภายใน Dashboard&quot; (มีผลรอบ login ถัดไป)</div>
            </div>

            {(() => {
              const noEmail = !editing && !form.email.trim();
              const off = busy || noEmail || !anyAccess;
              return (<>
                <button onClick={save} disabled={off}
                  style={{ marginTop: 14, border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: off ? "default" : "pointer",
                    background: off ? "#CBD5E1" : "#2563EB", color: "#fff" }}>
                  {busy ? "กำลังบันทึก…" : editing ? "อัปเดตสิทธิ์" : "เพิ่มผู้ใช้"}
                </button>
                {!anyAccess && !noEmail && <span style={{ marginLeft: 10, fontSize: 12, color: "#D97706" }}>ต้องให้สิทธิ์อย่างน้อย 1 อย่าง (หัวข้อ หรือ โมดูล)</span>}
              </>);
            })()}
          </div>
        )}

        {/* table */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>ผู้ใช้ที่อนุญาต ({loading ? "…" : users.length})</div>
            <button onClick={() => load(true)} disabled={refreshing} title="รีเฟรช" style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <RefreshCw size={13} color="#64748B" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
          {data?.warn && <div style={{ padding: "10px 22px", fontSize: 12, color: "#B45309", background: "#FFFBEB", borderBottom: "1px solid #FDE68A" }}>⚠️ อ่าน Firestore ไม่สำเร็จ — แสดงเฉพาะ Super Admin</div>}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "#94A3B8", textAlign: "left", fontSize: 11.5, background: "#F8FAFC" }}>
                  <th style={{ padding: "11px 22px", fontWeight: 700 }}>ผู้ใช้</th>
                  <th style={{ padding: "11px 14px", fontWeight: 700 }}>สิทธิ์ (หัวข้อ + โมดูล)</th>
                  {isSuper && <th style={{ padding: "11px 14px", fontWeight: 700, textAlign: "right" }}></th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} style={{ padding: 28, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>กำลังโหลด…</td></tr>
                ) : users.map((u) => {
                  const isS = u.role === "super_admin";
                  return (
                    <tr key={u.email} style={{ borderTop: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "13px 22px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: isS ? "#7C3AED" : "#2563EB", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{(u.email[0] || "?").toUpperCase()}</div>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{u.email}</div>
                            {isS && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#7C3AED" }}><Crown size={11} /> Super Admin (ทุกสิทธิ์)</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        {isS ? <span style={{ fontSize: 12, color: "#7C3AED" }}>ทุกหัวข้อ + ทุกโมดูล</span> : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {SECTIONS.filter(s => u.perms[s].v).map(s => {
                                const acts = [u.perms[s].v && "ดู", u.perms[s].e && "แก้", u.perms[s].d && "ลบ"].filter(Boolean).join("/");
                                return <span key={s} style={{ fontSize: 11.5, fontWeight: 600, color: "#334155", background: "#F1F5F9", padding: "3px 9px", borderRadius: 999 }}>{SECTION_LABELS[s].split(" ")[0]}: {acts}</span>;
                              })}
                              {!SECTIONS.some(s => u.perms[s].v) && <span style={{ fontSize: 12, color: "#94A3B8" }}>ยังไม่มีสิทธิ์หัวข้อ</span>}
                            </div>
                            {/* สิทธิ์เข้าโมดูลอื่น (Agent / ราคารถ) */}
                            {MODULE_ROLES.some(m => u.modules?.[m.id]) && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {MODULE_ROLES.filter(m => u.modules?.[m.id]).map(m => {
                                  const val = u.modules?.[m.id];
                                  const roleLabel = m.roles.find(r => r.value === val)?.label || val;
                                  return <span key={m.id} style={{ fontSize: 11.5, fontWeight: 600, color: "#1E40AF", background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "3px 9px", borderRadius: 999 }}>{m.label.split(" ")[0]}: {roleLabel}</span>;
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      {isSuper && (
                        <td style={{ padding: "13px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                          {!isS && (<>
                            <button onClick={() => copyInvite(u.email)} title="คัดลอกข้อความเชิญ" style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "6px 9px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#059669", marginRight: 6 }}><Mail size={13} /> เชิญ</button>
                            <button onClick={() => startEdit(u)} title="แก้ไขสิทธิ์" style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569", marginRight: 6 }}><Pencil size={13} /> แก้ไข</button>
                            <button onClick={() => delUser(u.email)} title="ลบสิทธิ์" style={{ border: "1px solid #FECACA", background: "#fff", borderRadius: 8, padding: "6px 9px", cursor: "pointer", display: "inline-flex" }}><Trash2 size={14} color="#DC2626" /></button>
                          </>)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && !isSuper && <div style={{ fontSize: 12.5, color: "#94A3B8" }}>* เฉพาะ Super Admin เท่านั้นที่จัดการผู้ใช้/สิทธิ์ได้</div>}
      </div>
    </>
  );
}
