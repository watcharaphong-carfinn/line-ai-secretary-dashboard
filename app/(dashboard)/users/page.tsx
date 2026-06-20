"use client";
import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { Shield, ShieldCheck, Eye, User, AlertCircle, RefreshCw, Crown } from "lucide-react";

interface UserRow { email: string; role: string; addedBy?: string; addedAt?: string; }
interface Resp { users: UserRow[]; superAdmin: string; warn?: string }

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  super_admin: { label: "Super Admin", color: "#7C3AED", bg: "#F5F3FF", icon: <Crown size={13} /> },
  admin:       { label: "Admin",       color: "#2563EB", bg: "#EFF6FF", icon: <ShieldCheck size={13} /> },
  viewer:      { label: "Viewer",      color: "#059669", bg: "#ECFDF5", icon: <Eye size={13} /> },
};

function initials(email: string) {
  return (email[0] || "?").toUpperCase();
}

export default function UsersPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await fetch("/api/users");
      setData(await res.json());
    } catch (e) {
      setData({ users: [], superAdmin: "", warn: e instanceof Error ? e.message : String(e) });
    } finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const users = data?.users || [];

  return (
    <>
      <Topbar breadcrumb={["หน้าหลัก", "User Management"]} title="User Management · จัดการผู้ใช้" />
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* notice: auth ยังไม่เปิด */}
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "14px 18px", fontSize: 13.5, color: "#1E40AF", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Shield size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <b>Google Login ยังไม่เปิดใช้งาน</b> — ตอนนี้หน้านี้แสดงรายชื่อผู้ใช้ที่อนุญาต (allowlist) ที่เก็บใน Firestore
            <br />เมื่อเปิด Google Login แล้ว เฉพาะอีเมลในลิสต์นี้ถึงจะเข้าระบบได้ และ <b>Super Admin</b> จะเพิ่ม/ลบผู้ใช้ + กำหนดสิทธิ์ได้
          </div>
        </div>

        {data?.warn && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#B45309", display: "flex", gap: 8, alignItems: "center" }}>
            <AlertCircle size={14} /> อ่าน Firestore ไม่สำเร็จ ({data.warn}) — แสดงเฉพาะ Super Admin เริ่มต้น
          </div>
        )}

        {/* table card */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>ผู้ใช้ที่อนุญาต ({loading ? "…" : users.length})</div>
            <button onClick={() => load(true)} disabled={refreshing} title="รีเฟรช" style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <RefreshCw size={13} color="#64748B" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "#94A3B8", textAlign: "left", fontSize: 11.5, background: "#F8FAFC" }}>
                  <th style={{ padding: "11px 22px", fontWeight: 700, letterSpacing: "0.04em" }}>ผู้ใช้</th>
                  <th style={{ padding: "11px 14px", fontWeight: 700, letterSpacing: "0.04em" }}>สิทธิ์</th>
                  <th style={{ padding: "11px 14px", fontWeight: 700, letterSpacing: "0.04em" }}>เพิ่มโดย</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} style={{ padding: 28, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>กำลังโหลด…</td></tr>
                ) : users.map((u) => {
                  const rm = ROLE_META[u.role] || ROLE_META.viewer;
                  return (
                    <tr key={u.email} style={{ borderTop: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "13px 22px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: rm.color, color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials(u.email)}</div>
                          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{u.email}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: rm.color, background: rm.bg, padding: "4px 10px", borderRadius: 999 }}>
                          {rm.icon} {rm.label}
                        </span>
                      </td>
                      <td style={{ padding: "13px 14px", fontSize: 13, color: "#94A3B8" }}>{u.addedBy || (u.role === "super_admin" ? "— (เจ้าของระบบ)" : "—")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* add user (disabled จนกว่าจะเปิด auth) */}
        <div style={{ background: "#fff", border: "1px dashed #CBD5E1", borderRadius: 14, padding: "18px 22px", display: "flex", alignItems: "center", gap: 12, color: "#94A3B8" }}>
          <User size={18} />
          <div style={{ fontSize: 13.5 }}>
            <b style={{ color: "#64748B" }}>เพิ่มผู้ใช้</b> — จะใช้งานได้หลังเปิด Google Login (Super Admin เท่านั้น)
          </div>
        </div>

      </div>
    </>
  );
}
