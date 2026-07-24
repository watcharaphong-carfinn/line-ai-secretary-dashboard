"use client";
import { useEffect, useState } from "react";
import { ClipboardList, RefreshCw, AlertCircle, LogIn, LogOut, UserPlus, UserMinus, ShieldAlert, ShieldOff } from "lucide-react";

interface AuditRow { ts: string; action: string; actor: string; detail: string; }
interface Resp { logs?: AuditRow[]; error?: string }

const ACTION: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  login:        { label: "เข้าสู่ระบบ",       color: "#059669", bg: "#ECFDF5", icon: <LogIn size={13} /> },
  logout:       { label: "ออกจากระบบ",       color: "#64748B", bg: "#F1F5F9", icon: <LogOut size={13} /> },
  login_denied: { label: "ปฏิเสธการเข้าระบบ", color: "#DC2626", bg: "#FEF2F2", icon: <ShieldOff size={13} /> },
  user_add:     { label: "เพิ่มผู้ใช้",        color: "#2563EB", bg: "#EFF6FF", icon: <UserPlus size={13} /> },
  user_remove:  { label: "ลบผู้ใช้",          color: "#D97706", bg: "#FFFBEB", icon: <UserMinus size={13} /> },
};

function fmtTime(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export default function AuditPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    try { setData(await (await fetch("/api/audit")).json()); }
    catch (e) { setData({ error: e instanceof Error ? e.message : String(e) }); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const logs = data?.logs || [];
  const forbidden = data?.error === "forbidden";

  return (
    <>
      <div className="page-body" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 18 }}>

        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 18px", fontSize: 13, color: "#64748B", display: "flex", gap: 9, alignItems: "center" }}>
          <ClipboardList size={15} /> บันทึกเหตุการณ์ความปลอดภัย: เข้า/ออกระบบ, ปฏิเสธการเข้าถึง, เพิ่ม/ลบผู้ใช้ (เฉพาะ Super Admin ดูได้)
        </div>

        {forbidden && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#DC2626", display: "flex", gap: 8, alignItems: "center" }}>
            <ShieldAlert size={15} /> เฉพาะ Super Admin เท่านั้นที่ดู Audit Logs ได้
          </div>
        )}
        {data?.error && !forbidden && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#B45309", display: "flex", gap: 8, alignItems: "center" }}>
            <AlertCircle size={14} /> ดึงข้อมูลไม่สำเร็จ: {data.error}
          </div>
        )}

        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>เหตุการณ์ล่าสุด ({loading ? "…" : logs.length})</div>
            <button onClick={() => load(true)} disabled={refreshing} title="รีเฟรช" style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <RefreshCw size={13} color="#64748B" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "#94A3B8", textAlign: "left", fontSize: 11.5, background: "#F8FAFC" }}>
                  <th style={{ padding: "11px 22px", fontWeight: 700 }}>เวลา</th>
                  <th style={{ padding: "11px 14px", fontWeight: 700 }}>เหตุการณ์</th>
                  <th style={{ padding: "11px 14px", fontWeight: 700 }}>ผู้ใช้</th>
                  <th style={{ padding: "11px 14px", fontWeight: 700 }}>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ padding: 28, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>กำลังโหลด…</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: 28, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>{forbidden ? "—" : "ยังไม่มีบันทึก"}</td></tr>
                ) : logs.map((l, i) => {
                  const a = ACTION[l.action] || { label: l.action, color: "#64748B", bg: "#F1F5F9", icon: <ClipboardList size={13} /> };
                  return (
                    <tr key={i} style={{ borderTop: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "11px 22px", fontSize: 13, color: "#475569", whiteSpace: "nowrap" }}>{fmtTime(l.ts)}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: a.color, background: a.bg, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>{a.icon} {a.label}</span>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600 }}>{l.actor}</td>
                      <td style={{ padding: "11px 14px", fontSize: 13, color: "#64748B" }}>{l.detail || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
