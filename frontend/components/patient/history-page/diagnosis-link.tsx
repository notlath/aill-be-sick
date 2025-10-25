import { Chat, Message } from "@/app/generated/prisma";
import {
  getDiagnosisByChatId,
  getLatestTempDiagnosisByChatId,
} from "@/utils/diagnosis";
import Link from "next/link";

type DiagnosisLinkProps = Chat & { messages?: Message[] };

const DiagnosisLink = async ({
  chatId,
  id,
  createdAt,
  hasDiagnosis,
  messages,
}: DiagnosisLinkProps) => {
  const { success: diagnosis, error } = await getDiagnosisByChatId(chatId);

  if (error) {
    console.error(error);
    return null;
  }

  // If there's no final diagnosis yet, try to get the latest temp diagnosis for uncertainty
  const { success: latestTemp } = hasDiagnosis
    ? { success: null }
    : await getLatestTempDiagnosisByChatId(chatId);

  // Determine latest message content as fallback display when no diagnosis/temp diagnosis yet
  const latestMessageContentRaw =
    Array.isArray(messages) && messages.length
      ? [...messages].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0].content
      : undefined;
  const latestMessageContent =
    latestMessageContentRaw && latestMessageContentRaw.length > 120
      ? `${latestMessageContentRaw.slice(0, 120)}…`
      : latestMessageContentRaw;

  return (
    <Link
      href={`/diagnosis/${chatId}`}
      key={id}
      className="group flex items-center justify-between gap-6 py-4 px-3 rounded-2xl bg-base-100/90 border border-base-300/20 shadow-sm hover:shadow-xl hover:bg-base-100/100 hover:-translate-y-1 hover:scale-[1.015] transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{
        boxShadow:
          "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
      }}
    >
      {/* Left: content (disease + uncertainty or latest message) */}
      <div className="flex flex-col min-w-0">
        {hasDiagnosis && diagnosis ? (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base-content text-lg tracking-tight">
              {diagnosis.disease
                .split("_")
                .map(
                  (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                )
                .join(" ")}
            </span>
            {typeof diagnosis.uncertainty === "number" && (
              <span className="ml-2 text-muted text-sm">
                Uncertainty: {(diagnosis.uncertainty * 100).toFixed(2)}%
              </span>
            )}
          </div>
        ) : latestTemp ? (
          <div className="flex items-center gap-2">
            <span className="text-muted font-medium">
              {latestTemp.disease
                .toString()
                .split("_")
                .map(
                  (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                )
                .join(" ")}
            </span>
            {typeof latestTemp.uncertainty === "number" && (
              <span className="ml-2 text-muted text-sm">
                Uncertainty: {(latestTemp.uncertainty * 100).toFixed(2)}%
              </span>
            )}
          </div>
        ) : latestMessageContent ? (
          <span className="text-muted text-sm">{latestMessageContent}</span>
        ) : null}
      </div>

      {/* Right: date and time */}
      <div className="flex flex-col items-end min-w-48">
        <span className="font-medium text-base-content/80 text-sm">
          {new Date(createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
        <span className="text-muted text-xs">
          {new Date(createdAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </span>
      </div>
    </Link>
  );
};

export default DiagnosisLink;
