import LazyMarkdown from "@/components/ui/lazy-markdown";
import { Message, TempDiagnosis } from "@/lib/generated/prisma";
import { Explanation } from "@/types";
import { cn } from "@/utils/lib";
import { ChevronDown, ChevronUp, Info, XCircle } from "lucide-react";
import { memo, useState } from "react";
import InsightsModal from "./insights-modal";
import ViewInsightsBtn from "./view-insights-btn";

type ChatBubbleProps = {
  tempDiagnosis?: TempDiagnosis;
  isGettingExplanations: boolean;
  explanation: Explanation | null;
  userRole?: string;
  /** The user's original symptom description (for generating AI insights) */
  symptomsText?: string;
} & Message;

// EKG / pulse line — universally recognised as a medical indicator
const ActivityIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

type ConfidenceTier = { label: string; badgeClass: string };

const getConfidenceTier = (confidence: number): ConfidenceTier => {
  if (confidence >= 0.95)
    return { label: "Strong match", badgeClass: "badge-success" };
  if (confidence >= 0.7)
    return { label: "Possible match", badgeClass: "badge-warning" };
  return { label: "Weak match", badgeClass: "badge-error" };
};

const formatModelName = (modelUsed: string) => {
  if (modelUsed === "BIOCLINICAL_MODERNBERT") return "BioClinical-ModernBERT";
  if (modelUsed === "ROBERTA_TAGALOG") return "RoBERTa-Tagalog";
  return modelUsed;
};

const MARKDOWN_COMPONENTS = {
  p: ({ children }: any) => <p className="my-0">{children}</p>,
  strong: ({ children }: any) => (
    <strong className="font-bold">{children}</strong>
  ),
};

const ChatBubble = ({
  content,
  role,
  type,
  tempDiagnosis,
  isGettingExplanations,
  explanation,
  userRole,
  symptomsText,
}: ChatBubbleProps) => {
  const [showClinicianDetails, setShowClinicianDetails] = useState(false);

  const isError = type === "ERROR";
  const isInfo = type === "INFO";
  const isUrgentWarning = type === "URGENT_WARNING";
  const isDiagnosis = type === "DIAGNOSIS";
  const isQuestion = type === "QUESTION";

  const canSeeDetails = userRole === "DEVELOPER" || userRole === "CLINICIAN";
  // Clinicians/devs can see raw details on any diagnosis, not only low-confidence ones
  const shouldShowToggle = isDiagnosis && tempDiagnosis && canSeeDetails;

  // ── DIAGNOSIS bubble — distinct card layout ──────────────────────────────
  if (isDiagnosis) {
    const confidence = tempDiagnosis?.confidence ?? 0;
    const tier = getConfidenceTier(confidence);

    return (
      <article className="self-start !mb-0 w-full max-w-[85%] sm:max-w-[60%] break-words rounded-xl border border-base-300 bg-base-100 shadow-sm overflow-hidden">
        {/* Message content */}
        <div className="px-4 pt-4 pb-1">
          <LazyMarkdown components={MARKDOWN_COMPONENTS}>
            {content}
          </LazyMarkdown>
        </div>

        {/* Confidence tier badge */}
        {tempDiagnosis && (
          <div className="px-4 py-2">
            <span
              className={cn("badge badge-sm badge-outline", tier.badgeClass)}
            >
              {tier.label}
            </span>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mx-4 mb-3 rounded-md bg-base-200 px-3 py-2 text-xs text-base-content/70">
          This is a suggestion, not a diagnosis. Please consult a healthcare
          provider.
        </div>

        {/* Actionable guidance for low-confidence diagnoses */}
        {tempDiagnosis && tempDiagnosis.confidence < 0.7 && (
          <div className="mx-4 mb-3 rounded-md bg-info/10 px-3 py-2 text-xs text-base-content/70">
            <p>
              Consider noting your symptoms and when they started before
              visiting a healthcare provider.
            </p>
          </div>
        )}

        {/* Clinician / developer details (collapsed by default) */}
        {shouldShowToggle && (
          <div className="border-t border-base-300 px-4 py-3">
            <button
              onClick={() => setShowClinicianDetails(!showClinicianDetails)}
              className="flex items-center gap-1.5 text-xs font-medium text-base-content/50 hover:text-base-content transition-colors cursor-pointer"
              aria-expanded={showClinicianDetails}
            >
              {showClinicianDetails ? (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>
                {showClinicianDetails ? "Hide" : "Show"} details (for
                clinicians)
              </span>
            </button>

            {showClinicianDetails && tempDiagnosis && (
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-base-300 bg-base-200 p-3 text-xs">
                <dt className="text-base-content/50">Condition</dt>
                <dd className="font-medium text-base-content">
                  {tempDiagnosis.disease}
                </dd>
                <dt className="text-base-content/50">Confidence</dt>
                <dd className="font-medium text-base-content">
                  {(tempDiagnosis.confidence * 100).toFixed(1)}%
                </dd>
                <dt className="text-base-content/50">Uncertainty</dt>
                <dd className="font-medium text-base-content">
                  {(tempDiagnosis.uncertainty * 100).toFixed(1)}%
                </dd>
                <dt className="text-base-content/50">Model</dt>
                <dd
                  className="font-medium text-base-content truncate"
                  title={tempDiagnosis.modelUsed}
                >
                  {formatModelName(tempDiagnosis.modelUsed)}
                </dd>
              </dl>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="px-4 pb-4">
          <ViewInsightsBtn disabled={isGettingExplanations || !explanation} />
        </div>

        {explanation && (
          <InsightsModal
            tokens={explanation.tokens}
            importances={explanation.importances}
            disease={tempDiagnosis?.disease}
            symptoms={symptomsText}
          />
        )}
      </article>
    );
  }

  // ── QUESTION (read-only, past question in chat history) ────────────────────
  if (isQuestion) {
    return (
      <article className="self-start bg-base-200 text-base-content p-3 px-4 rounded-xl max-w-[85%] sm:max-w-[60%] break-words">
        <LazyMarkdown components={MARKDOWN_COMPONENTS}>{content}</LazyMarkdown>
      </article>
    );
  }

  // ── Regular bubbles (USER / AI / ERROR / INFO / URGENT_WARNING) ───────────────────────────
  const containerClass = cn(
    "p-3 px-4 rounded-xl max-w-[85%] sm:max-w-[60%] break-words",
    role === "USER" ? "self-end" : "self-start",
    isError
      ? "border border-red-400 bg-red-50 text-red-800"
      : isUrgentWarning
        ? "alert alert-warning shadow-sm"
        : isInfo
          ? "border border-blue-300 bg-blue-50 text-blue-900"
          : role === "USER"
            ? "bg-primary text-primary-content chat-bubble-user"
            : "bg-base-200 text-base-content chat-bubble-ai",
  );

  return (
    <article className={containerClass}>
      {isError && (
        <div className="flex items-center gap-2 mb-1 text-red-700">
          <XCircle className="w-4 h-4" aria-hidden="true" />
          <span className="font-semibold text-sm">Error</span>
        </div>
      )}
      {isUrgentWarning && (
        <div className="flex items-center gap-2 mb-2 text-warning-content font-semibold">
          <Info className="w-5 h-5" aria-hidden="true" />
          <span>Action Required</span>
        </div>
      )}
      {isInfo && (
        <div className="flex items-center gap-2 mb-1 text-blue-700">
          <Info className="w-4 h-4" aria-hidden="true" />
          <span className="font-semibold text-sm">Important</span>
        </div>
      )}
      <div>
        <LazyMarkdown components={MARKDOWN_COMPONENTS}>{content}</LazyMarkdown>
      </div>
    </article>
  );
};

export default memo(ChatBubble);
