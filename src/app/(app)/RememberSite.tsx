"use client";

import { useEffect } from "react";

/**
 * After a successful login, stash the user's site code on this device so the
 * login screen can highlight it next time (fallback for when IP detection
 * can't tell). Stores the site NAME to match the login art node ids.
 */
export function RememberSite({ siteName }: { siteName: string | null }) {
  useEffect(() => {
    if (!siteName) return;
    try {
      window.localStorage.setItem("tsm.lastSite", siteName);
    } catch {
      /* storage blocked — nothing to do */
    }
  }, [siteName]);

  return null;
}
