"use client";

import { useEffect, useMemo, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";
import { saveClinicalVerification } from "@/actions/save-clinical-verification";
import { Card } from "@/components/ui/card";
import { getClinicalVerificationProtocol } from "@/constants/clinical-verification-protocols";
import type {
  ClinicalVerificationPayload,
  ClinicalVerificationStatus,
  DiseaseVerificationProtocol,
  DiseaseVerificationSymptom,
} from "@/types/clinical-verification";
import {
  getClinicalVerificationStatusMeta,
  normalizeClinicalVerificationRecord,
  scoreClinicalVerification,
} from "@/utils/clinical-verification";

type NormalizedRecord = {
  disease: DiseaseVerificationProtocol["disease"];
  status: ClinicalVerificationStatus;
  payload: ClinicalVerificationPayload;
};

type ClinicalVerificationCardProps = {
  disease: string;
  chatId?: string;
  verificationStatus?: string | null;
  verificationPayload?: unknown;
  readOnly?: boolean;
  title?: string;
  description?: string;
  extractedSymptomIds?: string[];
  defaultExpanded?: boolean;
};

type SymptomSectionProps = {
  title: string;
  description: string;
  symptoms: DiseaseVerificationSymptom[];
  selectedIds: Set<string>;
  onToggle: (symptomId: string) => void;
  disabled: boolean;
  forcedDisabledIds?: Set<string>;
  tone?: "neutral" | "warning";
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const SymptomSection = ({
  title,
  description,
  symptoms,
  selectedIds,
  onToggle,
  disabled,
  forcedDisabledIds,
  tone = "neutral",
}: SymptomSectionProps) => {
  if (symptoms.length === 0) {
    return null;
  }

  const sectionToneClass =
    tone === "warning"
      ? "border-warning/30 bg-warning/5"
      : "border-base-300 bg-base-100";

  return (
    <section className={`rounded-xl border ${sectionToneClass} p-4 space-y-3`}>
      <div>
        <h4 className="font-semibold text-sm text-base-content">{title}</h4>
        <p className="text-xs text-base-content/60 mt-1 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="space-y-2">
        {symptoms.map((symptom) => {
          const isChecked = selectedIds.has(symptom.id);
          const isForcedDisabled = forcedDisabledIds?.has(symptom.id) ?? false;
          const isInputDisabled = disabled || isForcedDisabled;

          return (
            <label
              key={symptom.id}
              className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                isChecked
                  ? "border-primary/30 bg-primary/10"
                  : "border-base-300 bg-base-100"
              } ${isInputDisabled ? "cursor-default opacity-80" : "cursor-pointer hover:bg-base-200/60"}`}
            >
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary mt-0.5"
                checked={isChecked}
                disabled={isInputDisabled}
                onChange={() => onToggle(symptom.id)}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-base-content leading-snug">
                  {symptom.labels.en}
                </p>
                <p className="text-xs text-base-content/60 leading-snug">
                  {symptom.labels.tl}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
};

const SymptomPills = ({
  title,
  symptoms,
  emptyLabel,
  tone = "neutral",
}: {
  title: string;
  symptoms: DiseaseVerificationSymptom[];
  emptyLabel: string;
  tone?: "neutral" | "warning";
}) => (
  <div className="space-y-2">
    <p className="text-xs font-medium uppercase tracking-wide text-base-content/50">
      {title}
    </p>
    {symptoms.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {symptoms.map((symptom) => (
          <span
            key={symptom.id}
            className={`badge badge-sm whitespace-normal h-auto py-2 px-3 ${
              tone === "warning" ? "badge-warning" : "badge-outline"
            }`}
          >
            {symptom.labels.en}
          </span>
        ))}
      </div>
    ) : (
      <p className="text-sm text-base-content/60">{emptyLabel}</p>
    )}
  </div>
);

const ClinicalVerificationSummary = ({
  protocol,
  record,
  allowEdit,
  onEdit,
}: {
  protocol: DiseaseVerificationProtocol;
  record: NormalizedRecord | null;
  allowEdit: boolean;
  onEdit?: () => void;
}) => {
  const statusMeta = getClinicalVerificationStatusMeta(record?.status);
  const allSymptoms = [
    ...protocol.coreSymptoms,
    ...protocol.supportingSymptoms,
    ...protocol.contradictionSymptoms,
  ];
  const symptomMap = new Map(allSymptoms.map((symptom) => [symptom.id, symptom]));

  const selectedSymptoms = (record?.payload.selectedSymptomIds ?? [])
    .map((symptomId) => symptomMap.get(symptomId))
    .filter((symptom): symptom is DiseaseVerificationSymptom => Boolean(symptom));

  const contradictionSymptoms = (record?.payload.contradictionSymptomIds ?? [])
    .map((symptomId) => symptomMap.get(symptomId))
    .filter((symptom): symptom is DiseaseVerificationSymptom => Boolean(symptom));

  const matchedSymptoms = (record?.payload.matchedSymptomIds ?? [])
    .map((symptomId) => symptomMap.get(symptomId))
    .filter((symptom): symptom is DiseaseVerificationSymptom => Boolean(symptom));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`badge ${statusMeta.badgeClass} badge-sm`}>
              {statusMeta.label}
            </span>
            {record?.payload.submittedAt && (
              <span className="text-xs text-base-content/50">
                Saved {formatDateTime(record.payload.submittedAt)}
              </span>
            )}
          </div>
          <p className="text-sm text-base-content/70 leading-relaxed">
            {statusMeta.description}
          </p>
        </div>

        {allowEdit && onEdit && record && (
          <button
            type="button"
            className="btn btn-outline btn-sm gap-2"
            onClick={onEdit}
          >
            <RefreshCcw className="size-4" />
            Update checklist
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-base-200 p-3">
          <p className="text-xs uppercase tracking-wide text-base-content/50">
            Matched symptoms
          </p>
          <p className="mt-1 text-lg font-semibold text-base-content">
            {record?.payload.matchedCount ?? 0}/{protocol.minRequiredCount}
          </p>
        </div>
        <div className="rounded-xl bg-base-200 p-3">
          <p className="text-xs uppercase tracking-wide text-base-content/50">
            Core symptoms
          </p>
          <p className="mt-1 text-lg font-semibold text-base-content">
            {record?.payload.coreMatchedCount ?? 0}/{protocol.minCoreCount}
          </p>
        </div>
        <div className="rounded-xl bg-base-200 p-3">
          <p className="text-xs uppercase tracking-wide text-base-content/50">
            Other noted
          </p>
          <p className="mt-1 text-lg font-semibold text-base-content">
            {record?.payload.contradictionCount ?? 0}
          </p>
        </div>
      </div>

      {record ? (
        <div className="space-y-4 rounded-xl border border-base-300 bg-base-100 p-4">
          <SymptomPills
            title="Symptoms checked"
            symptoms={selectedSymptoms}
            emptyLabel="No symptoms were checked."
          />
          <SymptomPills
            title="Symptoms that supported the result"
            symptoms={matchedSymptoms}
            emptyLabel="None of the checked symptoms matched the protocol list."
          />
          <SymptomPills
            title="Other noted symptoms"
            symptoms={contradictionSymptoms}
            emptyLabel="No other symptoms were noted."
          />
        </div>
      ) : (
        <div className="alert alert-info bg-info/10 border border-info/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl text-info-content">
          <div className="flex items-start sm:items-center gap-3">
            <ShieldAlert className="size-5 shrink-0 text-info mt-0.5 sm:mt-0" />
            <p className="text-sm leading-relaxed text-base-content/80">
              This result has not yet been checked against the {protocol.diseaseName} symptom guide.
            </p>
          </div>
          {allowEdit && onEdit && (
            <button
              type="button"
              className="btn btn-primary btn-sm shrink-0"
              onClick={onEdit}
            >
              Verify symptoms
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default function ClinicalVerificationCard({
  disease,
  chatId,
  verificationStatus,
  verificationPayload,
  readOnly = false,
  title = "Clinical symptom check",
  description,
  extractedSymptomIds = [],
  defaultExpanded = false,
}: ClinicalVerificationCardProps) {
  const protocol = getClinicalVerificationProtocol(disease);

  const normalizedPropRecord = useMemo(
    () =>
      protocol
        ? normalizeClinicalVerificationRecord(
            protocol.disease,
            verificationStatus,
            verificationPayload,
          )
        : null,
    [protocol, verificationStatus, verificationPayload],
  );

  const [savedRecord, setSavedRecord] = useState<NormalizedRecord | null>(
    normalizedPropRecord,
  );
  const defaultSelected =
    normalizedPropRecord?.payload.selectedSymptomIds ??
    (extractedSymptomIds.length > 0 ? extractedSymptomIds : []);
    
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<string[]>(defaultSelected);
  const [isEditing, setIsEditing] = useState(
    defaultExpanded && !readOnly && !normalizedPropRecord && Boolean(chatId)
  );

  useEffect(() => {
    setSavedRecord(normalizedPropRecord);
    
    if (normalizedPropRecord) {
      setSelectedSymptomIds(normalizedPropRecord.payload.selectedSymptomIds ?? []);
    } else if (extractedSymptomIds.length > 0) {
      // Always pre-fill extracted if not yet saved on mount or prop update
      setSelectedSymptomIds(extractedSymptomIds);
    }
    
    // Removed setIsEditing to prevent aggressive snapping shut of the UI
  }, [chatId, normalizedPropRecord, readOnly, extractedSymptomIds.join(",")]);

  const preview = useMemo(
    () =>
      protocol
        ? scoreClinicalVerification(protocol, selectedSymptomIds)
        : null,
    [protocol, selectedSymptomIds],
  );

  const { execute, isExecuting } = useAction(saveClinicalVerification, {
    onSuccess: ({ data }) => {
      if (!protocol) {
        return;
      }

      if (!data) {
        toast.error("We could not save the checklist right now.");
        return;
      }

      if ("error" in data && data.error) {
        toast.error(data.error);
        return;
      }

      if (!("status" in data)) {
        toast.error("We could not save the checklist right now.");
        return;
      }

      const normalizedRecord = normalizeClinicalVerificationRecord(
        protocol.disease,
        data.status,
        {
          protocolVersion: data.protocolVersion,
          selectedSymptomIds: data.selectedSymptomIds ?? [],
          matchedSymptomIds: data.matchedSymptomIds ?? [],
          missingCoreSymptomIds: data.missingCoreSymptomIds ?? [],
          contradictionSymptomIds: data.contradictionSymptomIds ?? [],
          matchedCount: data.matchedCount,
          minRequiredCount: data.minRequiredCount,
          coreMatchedCount: data.coreMatchedCount,
          minCoreCount: data.minCoreCount,
          contradictionCount: data.contradictionCount,
          submittedAt: data.submittedAt,
        },
      );

      setSavedRecord(normalizedRecord);
      setSelectedSymptomIds(data.selectedSymptomIds ?? []);
      setIsEditing(false);
      toast.success("Clinical symptom check saved.");
    },
    onError: () => {
      toast.error("We could not save the checklist right now.");
    },
  });

  if (!protocol) {
    return null;
  }

  const selectedSymptomSet = new Set(selectedSymptomIds);
  const extractedSymptomSet = useMemo(() => new Set(extractedSymptomIds), [extractedSymptomIds.join(",")]);
  const previewMeta = getClinicalVerificationStatusMeta(preview?.status);
  const allowEdit = !readOnly && Boolean(chatId);
  const showEditor = allowEdit && isEditing;

  const toggleSymptom = (symptomId: string) => {
    if (extractedSymptomSet.has(symptomId)) return; // Prevents unchecking forced symptoms programmatically too
    setSelectedSymptomIds((currentIds) =>
      currentIds.includes(symptomId)
        ? currentIds.filter((id) => id !== symptomId)
        : [...currentIds, symptomId],
    );
  };

  const handleSubmit = () => {
    if (!chatId || selectedSymptomIds.length === 0 || isExecuting) {
      return;
    }

    execute({
      chatId,
      disease: protocol.disease,
      selectedSymptomIds,
    });
  };

  const handleReset = () => {
    if (savedRecord) {
      setSelectedSymptomIds(savedRecord.payload.selectedSymptomIds);
      setIsEditing(false);
      return;
    }

    setSelectedSymptomIds([]);
  };

  const summaryDescription =
    description ??
    `This step compares your checked symptoms with the ${protocol.diseaseName} symptom guide. It does not change the AI result, but it helps show whether the symptom pattern strongly supports it.`;

  return (
    <Card className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">
      <div className="border-b border-base-300 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base-200">
            <ClipboardList className="size-5 text-base-content/70" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-base-content">
                {title}
              </h3>
              <span className="badge badge-outline badge-sm">
                {protocol.diseaseName}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-base-content/70">
              {summaryDescription}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        {!showEditor ? (
          <ClinicalVerificationSummary
            protocol={protocol}
            record={savedRecord}
            allowEdit={allowEdit}
            onEdit={() => setIsEditing(true)}
          />
        ) : (
          <>
            {preview && (
              <div
                className={`alert ${
                  preview.status === "CONFIRMED"
                    ? "alert-success"
                    : preview.status === "BORDERLINE"
                      ? "alert-warning"
                      : "alert-error"
                }`}
              >
                {preview.status === "CONFIRMED" ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <AlertTriangle className="size-5" />
                )}
                <div>
                  <p className="font-medium">{previewMeta.label}</p>
                  <p className="text-sm">
                    {previewMeta.description}
                    {" "}
                    Matched {preview.matchedCount} of {protocol.minRequiredCount} required symptoms, with {preview.coreMatchedCount} of {protocol.minCoreCount} core symptoms.
                  </p>
                </div>
              </div>
            )}

            <SymptomSection
              title="Core symptoms"
              description={`These are the main findings used to support ${protocol.diseaseName}.`}
              symptoms={protocol.coreSymptoms}
              selectedIds={selectedSymptomSet}
              onToggle={toggleSymptom}
              disabled={isExecuting}
              forcedDisabledIds={extractedSymptomSet}
            />

            <SymptomSection
              title="Supporting symptoms"
              description="These can strengthen the match when they appear with the core symptoms."
              symptoms={protocol.supportingSymptoms}
              selectedIds={selectedSymptomSet}
              onToggle={toggleSymptom}
              disabled={isExecuting}
              forcedDisabledIds={extractedSymptomSet}
            />

            <SymptomSection
              title="Other symptoms to note"
              description="Please check any of these if you are experiencing them. This helps your healthcare provider get a complete picture."
              symptoms={protocol.contradictionSymptoms}
              selectedIds={selectedSymptomSet}
              onToggle={toggleSymptom}
              disabled={isExecuting}
              forcedDisabledIds={extractedSymptomSet}
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleReset}
                disabled={isExecuting}
              >
                {savedRecord ? "Cancel" : "Clear"}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isExecuting || selectedSymptomIds.length === 0}
              >
                {isExecuting ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    Saving...
                  </>
                ) : savedRecord ? (
                  "Save updated checklist"
                ) : (
                  "Save clinical check"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
