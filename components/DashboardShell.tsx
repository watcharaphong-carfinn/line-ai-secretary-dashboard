"use client";
import Sidebar from "./Sidebar";
import { DrawerProvider, useDrawer } from "./drawer-context";
import AccessProvider from "./access-context";
import PortalTopbar from "./PortalTopbar";

function Overlay() {
  const { open, setOpen } = useDrawer();
  return (
    <div
      className={`sidebar-overlay${open ? " open" : ""}`}
      onClick={() => setOpen(false)}
      aria-hidden
    />
  );
}

// แถบบน portal (ต้องอยู่ใน DrawerProvider เพื่อใช้ hamburger เปิด sidebar บนมือถือ)
function ShellBar() {
  const { toggle } = useDrawer();
  return <PortalTopbar onMenu={toggle} />;
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AccessProvider>
      <DrawerProvider>
        {/* โครงเดียวกับโมดูลที่ฝัง: แถบบนพาดเต็มความกว้าง → sidebar+เนื้อหาอยู่ใต้ */}
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <ShellBar />
          <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
            <Sidebar />
            <Overlay />
            <main style={{ flex: 1, overflow: "auto", background: "#F8FAFC" }}>{children}</main>
          </div>
        </div>
      </DrawerProvider>
    </AccessProvider>
  );
}
