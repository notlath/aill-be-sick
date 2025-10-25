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
      className="group flex items-center justify-between gap-4 py-5 border-b border-border w-full"
    >
      {/* Left: content (disease + uncertainty or latest message) */}
      <p className="group-hover:text-base-content transition-colors truncate">
        {hasDiagnosis && diagnosis ? (
          <>
            <span className="font-semibold text-base-content">
              {diagnosis.disease
                .split("_")
                .map(
                  (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                )
                .join(" ")}
            </span>
            {typeof diagnosis.uncertainty === "number" && (
              <span className="ml-2 opacity-80 text-muted">
                Uncertainty: {(diagnosis.uncertainty * 100).toFixed(2)}%
              </span>
            )}
          </>
        ) : latestTemp ? (
          <span className="text-muted">
            {latestTemp.disease
              .toString()
              .split("_")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(" ")}
            {typeof latestTemp.uncertainty === "number" && (
              <span className="ml-2 opacity-80">
                Uncertainty: {(latestTemp.uncertainty * 100).toFixed(2)}%
              </span>
            )}
          </span>
        ) : latestMessageContent ? (
          <span className="text-muted">{latestMessageContent}</span>
        ) : null}
      </p>

      {/* Right: date and time */}
      <p className="font-medium text-muted group-hover:text-base-content transition-colors whitespace-nowrap min-w-80">
        {new Date(createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}{" "}
        at{" "}
        {new Date(createdAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}
      </p>
    </Link>
  );
};

export default DiagnosisLink;
