"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, AlertOctagon, AlertTriangle, ShieldAlert, MapPin, Clock, Stethoscope, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { parseUtcDate } from "@/utils/lib";
import { getSeverityLabel } from "@/utils/alert-severity";
import type { Alert, AlertStatus } from "@/types";
import { getDistrictCentroid } from "@/constants/bagong-silangan-districts";

interface AlertCardProps {
  alert: Alert;
  onViewDetails: (alert: Alert) => void;
  onAcknowledge: (id: number) => Promise<void>;
  onDismiss: (id: number) => Promise<void>;
  onResolve: (id: number) => Promise<void>;
}

// Standarized UI colors independent of DaisyUI themes
const severityConfig = {
  CRITICAL: {
    icon: ShieldAlert,
    color: "#ef4444", // red-500
    bg: "bg-[#ef4444]/10",
    text: "text-[#ef4444]",
    border: "border-[#ef4444]/30",
    borderLeft: "border-l-[#ef4444]",
  },
  HIGH: {
    icon: AlertOctagon,
    color: "#f97316", // orange-500
    bg: "bg-[#f97316]/10",
    text: "text-[#f97316]",
    border: "border-[#f97316]/30",
    borderLeft: "border-l-[#f97316]",
  },
  MEDIUM: {
    icon: AlertTriangle,
    color: "#eab308", // yellow-500
    bg: "bg-[#eab308]/10",
    text: "text-[#eab308]",
    border: "border-[#eab308]/30",
    borderLeft: "border-l-[#eab308]",
  },
  LOW: {
    icon: Info,
    color: "#3b82f6", // blue-500
    bg: "bg-[#3b82f6]/10",
    text: "text-[#3b82f6]",
    border: "border-[#3b82f6]/30",
    borderLeft: "border-l-[#3b82f6]",
  },
};

const statusConfig: Record<AlertStatus, { label: string; classes: string }> = {
  NEW: { label: "New", classes: "bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20" }, // violet-500
  ACKNOWLEDGED: { label: "Acknowledged", classes: "bg-[#0ea5e9]/10 text-[#0ea5e9] border-[#0ea5e9]/20" }, // sky-500
  DISMISSED: { label: "Dismissed", classes: "bg-[#64748b]/10 text-[#64748b] border-[#64748b]/20" }, // slate-500
  RESOLVED: { label: "Resolved", classes: "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20" }, // emerald-500
};

export function AlertCard({
  alert,
  onViewDetails,
  onAcknowledge,
  onDismiss,
}: AlertCardProps) {
  const router = useRouter();
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAcknowledging(true);
    try {
      await onAcknowledge(alert.id);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissing(true);
    try {
      await onDismiss(alert.id);
    } finally {
      setIsDismissing(false);
    }
  };

  const handleViewOnMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const meta = alert.metadata as any;
    const params = new URLSearchParams();
    
    if (alert.type === "OUTBREAK") {
      params.set("tab", "by-disease");
      if (meta?.disease) params.set("disease", meta.disease);
      if (meta?.district) {
        const centroid = getDistrictCentroid(meta.district);
        if (centroid) {
          params.set("lat", String(centroid.lat));
          params.set("lng", String(centroid.lng));
        }
      }
    } else {
      params.set("tab", "by-anomaly");
      if (meta?.disease) params.set("disease", meta.disease);
      if (meta?.latitude) params.set("lat", String(meta.latitude));
      if (meta?.longitude) params.set("lng", String(meta.longitude));
    }
    
    router.push(`/map?${params.toString()}`);
  };

  const isPending = alert.status === "NEW";
  const date = parseUtcDate(alert.createdAt);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });
  
  const severityKey = alert.severity as keyof typeof severityConfig;
  const config = severityConfig[severityKey] || severityConfig.LOW;
  const Icon = config.icon;
  const statusInfo = statusConfig[alert.status];

  return (
    <Card 
      className={`group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-md border-l-4 ${config.borderLeft} border-border`}
      onClick={() => onViewDetails(alert)}
    >
      <CardContent className="p-0 flex flex-col sm:flex-row h-full">
        {/* Main Content Area */}
        <div className="flex-1 p-5 space-y-4">
          {/* Header Row */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusInfo.classes}`}>
                {statusInfo.label}
              </span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}>
                <Icon className="w-3.5 h-3.5" />
                {getSeverityLabel(alert.severity)}
              </span>
              {alert.severity === "CRITICAL" && isPending && (
                <span className="flex h-2.5 w-2.5 relative ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ef4444]"></span>
                </span>
              )}
            </div>
            
            <div className="flex items-center text-xs font-medium text-base-content/60 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              {timeAgo}
            </div>
          </div>

          {/* Message Content */}
          <div className="pr-4">
            <h3 className="text-base sm:text-lg font-semibold text-base-content leading-snug line-clamp-2">
              {alert.message}
            </h3>
          </div>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-base-content/70">
            {(alert.metadata as any)?.disease && (
              <div className="flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-base-content/50" />
                <span className="font-medium text-base-content/80">
                  {(alert.metadata as any).disease}
                </span>
              </div>
            )}
            
            {((alert.metadata as any)?.district || (alert.metadata as any)?.barangay) && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-base-content/50" />
                <span className="font-medium">
                  {[(alert.metadata as any).district, (alert.metadata as any).barangay]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions Sidebar (Desktop) / Bottom bar (Mobile) */}
        <div className="flex sm:flex-col justify-end sm:justify-center items-stretch gap-2 p-4 sm:p-5 bg-base-200 sm:border-l border-t sm:border-t-0 border-base-300 sm:w-48 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isPending && (
            <>
              <button
                onClick={handleAcknowledge}
                disabled={isAcknowledging || isDismissing}
                className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center
                  ${isAcknowledging 
                    ? "bg-base-200 text-base-content/50 cursor-not-allowed" 
                    : `bg-base-100 border border-base-300 hover:bg-base-200 ${config.text} hover:border-current`}`}
              >
                {isAcknowledging ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : "Acknowledge"}
              </button>
              
              <button
                onClick={handleDismiss}
                disabled={isAcknowledging || isDismissing}
                className="w-full py-2 px-3 rounded-lg text-sm font-medium bg-transparent border border-border text-base-content hover:bg-base-300 hover:border-base-content/50 transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isDismissing ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : "Dismiss"}
              </button>
            </>
          )}

          {((alert.type === "ANOMALY" && (alert.metadata as any)?.latitude) ||
            (alert.type === "OUTBREAK" && (alert.metadata as any)?.district)) && (
            <button
              onClick={handleViewOnMap}
              className="w-full py-2 px-3 rounded-lg text-sm font-medium bg-transparent border border-border text-base-content hover:bg-base-300 hover:border-base-content/50 transition-colors flex items-center justify-center group-button"
            >
              View Map
            </button>
          )}

          <button
            onClick={() => onViewDetails(alert)}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium bg-transparent border border-border text-base-content hover:bg-base-300 hover:border-base-content/50 transition-colors flex items-center justify-center"
          >
            Details
            <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

