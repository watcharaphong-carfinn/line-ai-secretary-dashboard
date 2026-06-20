"use client";
import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { Shield, ShieldCheck, Eye, AlertCircle, RefreshCw, Crown, Trash2, UserPlus } from "lucide-react";

interface UserRow { email: string; role: string; addedBy?: string; addedAt?: string; }
interface Resp { users: UserRow[]; superAdmin: string; warn?: string }

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  super_admin: { label: "Super Admin", color: "#7C3AED", bg: "#F5F3FF", icon: <Crown size={13} /> },
  admin:       { label: "Admin",       color: "#2563EB", bg: "#EFF6FF", icon: <ShieldCheck size={13} /> },
  viewer:      { label: "Viewer",      color: "#059669", bg: "#ECFDF5", icon: <Eye size={13} /> },
};

export default function UsersPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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

  const addUser = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setMsg({ type: "ok", text: `เพิ่ม ${j.email} (${j.role}) แล้ว` }); setEmail("");
      await load(true);
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

  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "User Management"]} title="User Management · จัดการผู้ใช้" />
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "14px 18px", fontSize: 13.5, color: "#1E40AF", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Shield size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          <div>เฉพาะอีเมลในลิสต์นี้ (+ โดเมน carfinn.com) เข้าระบบได้ — <b>Super Admin</b> เพิ่ม/ลบผู้ใช้และกำหนดสิทธิ์ได้</div>
        </div>

        {msg && (
          <div style={{ borderRadius: 10, padding: "10px 14px", fontSize: 13, display: "flex", gap: 8, alignItems: "center",
            background: msg.type === "ok" ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${msg.type === "ok" ? "#A7F3D0" : "#FECACA"}`, color: msg.type === "ok" ? "#059669" : "#DC2626" }}>
            {msg.type === "ok" ? "✅" : <AlertCircle size={14} />} {msg.text}
          </div>
        )}

        {/* add user (super admin) */}
        {isSuper && (
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 15, fontWeight: 700 }}>
              <UserPlus size={17} color="#2563EB" /> เพิ่มผู้ใช้
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมล (เช่น name@carfinn.com)" type="email"
                style={{ flex: "1 1 280px", border: "1px solid #E2E8F0", borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none" }} />
              <select value={role} onChange={e => setRole(e.target.value)}
                style={{ border: "1px solid #E2E8F0", borderRadius: 9, padding: "10px 13px", fontSize: 13.5, background: "#fff", cursor: "pointer" }}>
                <option value="viewer">Viewer (ดูอย่างเดียว)</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={addUser} disabled={busy || !email}
                style={{ border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: busy || !email ? "default" : "pointer",
                  background: busy || !email ? "#CBD5E1" : "#2563EB", color: "#fff" }}>
                {busy ? "กำลังเพิ่ม…" : "เพิ่ม"}
              </button>
            </div>
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
          {data?.warn && (
            <div style={{ padding: "10px 22px", fontSize: 12, color: "#B45309", background: "#FFFBEB", borderBottom: "1px solid #FDE68A" }}>
              ⚠️ อ่าน Firestore ไม่สำเร็จ — แสดงเฉพาะ Super Admin
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 540, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "#94A3B8", textAlign: "left", fontSize: 11.5, background: "#F8FAFC" }}>
                  <th style={{ padding: "11px 22px", fontWeight: 700 }}>ผู้ใช้</th>
                  <th style={{ padding: "11px 14px", fontWeight: 700 }}>สิทธิ์</th>
                  <th style={{ padding: "11px 14px", fontWeight: 700 }}>เพิ่มโดย</th>
                  {isSuper && <th style={{ padding: "11px 14px", fontWeight: 700, textAlign: "right" }}></th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ padding: 28, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>กำลังโหลด…</td></tr>
                ) : users.map((u) => {
                  const rm = ROLE_META[u.role] || ROLE_META.viewer;
                  return (
                    <tr key={u.email} style={{ borderTop: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "13px 22px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: rm.color, color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{(u.email[0] || "?").toUpperCase()}</div>
                          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{u.email}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: rm.color, background: rm.bg, padding: "4px 10px", borderRadius: 999 }}>{rm.icon} {rm.label}</span>
                      </td>
                      <td style={{ padding: "13px 14px", fontSize: 13, color: "#94A3B8" }}>{u.addedBy || (u.role === "super_admin" ? "— (เจ้าของระบบ)" : "—")}</td>
                      {isSuper && (
                        <td style={{ padding: "13px 14px", textAlign: "right" }}>
                          {u.role !== "super_admin" && (
                            <button onClick={() => delUser(u.email)} title="ลบสิทธิ์" style={{ border: "1px solid #FECACA", background: "#fff", borderRadius: 8, padding: "6px 9px", cursor: "pointer", display: "inline-flex" }}>
                              <Trash2 size={14} color="#DC2626" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && !isSuper && (
          <div style={{ fontSize: 12.5, color: "#94A3B8" }}>* เฉพาะ Super Admin เท่านั้นที่เพิ่ม/ลบผู้ใช้ได้</div>
        )}
      </div>
    </>
  );
}
