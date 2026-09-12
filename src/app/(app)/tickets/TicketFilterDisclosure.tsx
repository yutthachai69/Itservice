"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function TicketFilterDisclosure({ children }: { children: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const syncDisclosure = () => {
      if (detailsRef.current) detailsRef.current.open = desktop.matches;
    };

    syncDisclosure();
    desktop.addEventListener("change", syncDisclosure);
    return () => desktop.removeEventListener("change", syncDisclosure);
  }, []);

  return (
    <details ref={detailsRef} className="ticket-filters group">
      {children}
    </details>
  );
}
