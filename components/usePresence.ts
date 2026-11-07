"use client";

import { useEffect, useState } from "react";

/**
 * Keeps something mounted for `ms` after it closes, so it can play an exit
 * animation instead of vanishing. `leaving` is true during that window.
 */
export function usePresence(open: boolean, ms = 160) {
  const [mounted, setMounted] = useState(open);
  // Opening mounts immediately (render-phase update, no extra frame).
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(timer);
  }, [open, mounted, ms]);

  return { mounted: open || mounted, leaving: mounted && !open };
}
