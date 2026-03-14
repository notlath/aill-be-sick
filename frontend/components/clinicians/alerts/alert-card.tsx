"use client";

import { useState } from "react";
import { Info, AlertOctagon, AlertTriangle, ShieldAlert, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { getSeverityBadgeClass, getSeverityLabel } from "@/utils/alert-severity";
import type { Alert, AlertStatus } from "@/types";
import { useRouter } from "next/navigation";

interface AlertCardProps {
  alert: Alert;
  onViewDetails: (alert: Alert) => void;
  onAcknowledge: (id: number) => Promise<void>;
  onDismiss: (id: number) => Promise<void>;
  onResolve: (id: number) => Promise<void>;
}

const severityIcon = {
  CRITICAL: ShieldAlert,
  HIGH: AlertOctagon,
  MEDIUM: AlertTriangle,
  LOW: Info,
};

const statusLabel: Record<AlertStatus, string> = {
  NEW: "New",
  ACKNOWLEDGED: "Acknowledged",
  DISMISSED: "Dismissed",
  RESOLVED: "Resolved",
};

const statusBadgeClass: Record<AlertStatus, string> = {
  NEW: "bg-error/10 text-error border-error/20",
  ACKNOWLEDGED: "bg-success/10 text-success border-success/20",
  DISMISSED: "bg-base-200 text-base-content/70 border-base-300",
  RESOLVED: "bg-info/10 text-info border-info/20",
};

export function AlertCard({
  alert,
  onViewDetails,
  onAcknowledge,
  onDismiss,
  onResolve,
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
    const metadata = alert.metadata;
    const hasCoords = metadata?.latitude != null && metadata?.longitude != null;
    const hasDisease = !!metadata?.disease;

    const params = new URLSearchParams();
    params.set("tab", "by-anomaly");

    if (hasDisease) {
      params.set("disease", metadata!.disease!);
    }

    if (hasCoords) {
      params.set("lat", String(metadata!.latitude!));
      params.set("lng", String(metadata!.longitude!));
      params.set("zoom", "15");
    }

    const queryString = params.toString();
    router.push(`/map?${queryString}`);
  };

  const isPending = alert.status === "NEW";
  const date = new Date(alert.createdAt);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });
  const Icon = severityIcon[alert.severity as keyof typeof severityIcon];

  return (
    <Card className="hover:border-primary/30 group cursor-pointer" onClick={() => onViewDetails(alert)}>
      <CardContent className="p-5 flex flex-col sm:flex-row gap-4">
        {/* Left Icon Area */}
        <div className="flex-none pt-1">
          <div className={`p-2.5 rounded-full ${alert.severity === "CRITICAL" ? "bg-error/10 text-error inline-flex relative" :
            alert.severity === "HIGH" ? "bg-warning/10 text-warning" :
              alert.severity === "MEDIUM" ? "bg-info/10 text-info" :
                "bg-base-200 text-base-content/60"
            }`}>
            <Icon className="w-6 h-6" />
            {alert.severity === "CRITICAL" ? (
              <span className="absolute top-0 right-0 w-3 h-3 bg-error rounded-full animate-ping opacity-75" />
            ) : null}
            {alert.severity === "CRITICAL" ? (
              <span className="absolute top-0 right-0 w-3 h-3 bg-error rounded-full" />
            ) : null}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-1.5 flex flex-col">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${statusBadgeClass[alert.status]}`}>
              {statusLabel[alert.status]}
            </span>
            <span className={`badge badge-sm border-none ${getSeverityBadgeClass(alert.severity)}`}>
              {getSeverityLabel(alert.severity)}
            </span>
            {alert.diagnosisId ? (
              <span className="text-xs text-base-content/50 bg-base-200 px-2 py-0.5 rounded">
                Diagnosis ID: {alert.diagnosisId}
              </span>
            ) : null}
          </div>

          <p className="text-base font-medium text-base-content leading-snug line-clamp-2 title-tooltip" title={alert.message}>
            {alert.message}
          </p>
          <div className="text-xs text-base-content/40 mt-auto flex items-center gap-1.5">
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* Actions Area */}
        <div className="flex sm:flex-row justify-end items-end gap-2 pt-1 sm:pl-4" onClick={(e) => e.stopPropagation()}>
          {isPending ? (
            <>
              <button
                onClick={handleAcknowledge}
                disabled={isAcknowledging || isDismissing}
                className="btn btn-sm btn-outline border-primary/30 hover:bg-primary hover:border-primary text-primary hover:text-primary-content h-8 min-h-0"
              >
                {isAcknowledging ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Wait...
                  </>
                ) : (
                  "Acknowledge"
                )}
              </button>
              <button
                onClick={handleDismiss}
                disabled={isAcknowledging || isDismissing}
                className="btn btn-sm btn-outline border-border hover:bg-base-200 text-base-content/50 hover:text-base-content/80 h-8 min-h-0"
              >
                {isDismissing ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Wait...
                  </>
                ) : (
                  "Dismiss"
                )}
              </button>
            </>
          ) : null}
          <button
            onClick={() => onViewDetails(alert)}
            className="btn btn-sm btn-outline border-border hover:bg-base-200 text-base-content/50 hover:text-base-content/80 h-8 min-h-0"
          >
            View details
          </button>
          <button
            onClick={handleViewOnMap}
            disabled={!alert.metadata?.latitude || !alert.metadata?.longitude}
            className="btn btn-sm btn-outline border-primary/30 hover:bg-primary hover:border-primary text-primary hover:text-primary-content h-8 min-h-0 gap-1.5"
            title={!alert.metadata?.latitude || !alert.metadata?.longitude ? "No location data available" : "View on map"}
          >
            <MapPin className="w-4 h-4" />
            View on map
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
