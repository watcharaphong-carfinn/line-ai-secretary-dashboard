"use client";
import { createContext, useContext, useState } from "react";

interface DrawerCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

const Ctx = createContext<DrawerCtx>({ open: false, setOpen: () => {}, toggle: () => {} });

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Ctx.Provider value={{ open, setOpen, toggle: () => setOpen((o) => !o) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useDrawer = () => useContext(Ctx);
