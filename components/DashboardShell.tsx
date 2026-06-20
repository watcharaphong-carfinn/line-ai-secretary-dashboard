"use client";
import Sidebar from "./Sidebar";
import { DrawerProvider, useDrawer } from "./drawer-context";

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

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <DrawerProvider>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar />
        <Overlay />
        <main style={{ flex: 1, overflow: "auto", background: "#F8FAFC" }}>{children}</main>
      </div>
    </DrawerProvider>
  );
}
