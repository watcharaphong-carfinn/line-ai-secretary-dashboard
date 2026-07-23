"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Copy, Check } from "lucide-react";

// ตรวจจับ in-app browser (webview ในแอป) ที่ Google บล็อกการล็อกอิน (error 403 disallowed_useragent)
//   LINE / Facebook / Instagram / Messenger / WeChat / TikTok / Android generic webview
function isInAppBrowser(ua: string): boolean {
  return /\bLine\//i.test(ua)                       // LINE
    || /FBAN|FBAV|FB_IAB/i.test(ua)                 // Facebook
    || /Instagram/i.test(ua)                        // Instagram
    || /\bMessenger\b/i.test(ua)                    // FB Messenger
    || /MicroMessenger/i.test(ua)                   // WeChat
    || /musical_ly|Bytedance|TikTok/i.test(ua)      // TikTok
    || /; wv\)/i.test(ua);                          // Android WebView ทั่วไป
}

export default function InAppBrowserNotice() {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isInAppBrowser(navigator.userAgent)) setShow(true);
  }, []);

  if (!show) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // เผื่อ clipboard API ถูกบล็อกใน webview — เลือกข้อความให้ผู้ใช้ก็อปเอง
      setCopied(false);
    }
  };

  return (
    <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <AlertTriangle size={17} color="#EA580C" />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#9A3412" }}>เปิดในเบราว์เซอร์ก่อนนะครับ</span>
      </div>
      <div style={{ fontSize: 12.5, color: "#9A3412", lineHeight: 1.7, marginBottom: 12 }}>
        ตอนนี้เปิดอยู่ในแอป (เช่นในไลน์) ซึ่ง <b>Google ไม่ให้ล็อกอิน</b> ผ่านหน้าต่างในแอป<br />
        กดปุ่ม <b>⋯ / ⤴ มุมขวาบน → &quot;เปิดใน Safari / Chrome&quot;</b> หรือคัดลอกลิงก์ไปเปิดในเบราว์เซอร์
      </div>
      <button onClick={copyLink} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
        padding: "11px", borderRadius: 10, border: "1px solid #FDBA74",
        background: copied ? "#DCFCE7" : "#fff", color: copied ? "#166534" : "#9A3412",
        fontSize: 13.5, fontWeight: 700, cursor: "pointer",
      }}>
        {copied ? <><Check size={16} /> คัดลอกลิงก์แล้ว — ไปวางในเบราว์เซอร์</> : <><Copy size={16} /> คัดลอกลิงก์</>}
      </button>
    </div>
  );
}
