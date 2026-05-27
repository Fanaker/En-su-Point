import { createContext, useContext, useState, type ReactNode } from "react";
import { PointDetailModal } from "./PointDetailModal";

const Ctx = createContext<{ open: (id: string) => void } | null>(null);

export function PointModalProvider({ children }: { children: ReactNode }) {
  const [pointId, setPointId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Ctx.Provider value={{ open: (id) => { setPointId(id); setIsOpen(true); } }}>
      {children}
      <PointDetailModal pointId={pointId} open={isOpen} onOpenChange={setIsOpen} />
    </Ctx.Provider>
  );
}

export function usePointModal() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePointModal fuera de PointModalProvider");
  return v;
}