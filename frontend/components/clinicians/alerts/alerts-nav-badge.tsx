"use client";

import { useUnreadAlertsCount } from "@/stores/use-alerts-store";

const AlertsNavBadge = () => {
  const unreadCount = useUnreadAlertsCount();

  if (unreadCount === 0) return null;

  return (
    <span className="badge badge-error badge-xs absolute -top-1 -right-1 text-[10px] min-w-[16px] h-4 px-1 z-20">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
};

export default AlertsNavBadge;
