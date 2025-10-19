import { Chat } from "@/app/generated/prisma";
import { getDiagnosisByChatId } from "@/utils/diagnosis";
import Link from "next/link";

type DiagnosisLinkProps = {} & Chat;

const DiagnosisLink = async ({
  chatId,
  id,
  createdAt,
  hasDiagnosis,
}: DiagnosisLinkProps) => {
  const { success: diagnosis, error } = await getDiagnosisByChatId(chatId);

  if (error) {
    console.error(error);

    return null;
  }

  return (
    <Link
      href={`/diagnosis/${chatId}`}
      key={id}
      className="group flex justify-between items-center py-5 border-b border-border w-full"
    >
      <p className="font-medium text-muted group-hover:text-base-content transition-colors">
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
      {hasDiagnosis && diagnosis && (
        <p className="text-muted group-hover:text-base-content transition-colors">
          Diagnosis recorded:{" "}
          {diagnosis.disease
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ")}
        </p>
      )}
    </Link>
  );
};

export default DiagnosisLink;
