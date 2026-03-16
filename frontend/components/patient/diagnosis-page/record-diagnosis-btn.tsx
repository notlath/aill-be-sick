import { createDiagnosis } from "@/actions/create-diagnosis";
import { TempDiagnosis } from "@/lib/generated/prisma";
import { useAction } from "next-safe-action/hooks";

type RecordDiagnosisBtnProps = {
  tempDiagnosis?: TempDiagnosis;
  chatId: string;
  disabled?: boolean;
};

const RecordDiagnosisBtn = ({
  tempDiagnosis,
  chatId,
  disabled,
}: RecordDiagnosisBtnProps) => {
  const { execute, isExecuting } = useAction(createDiagnosis, {
    onSuccess: ({ data }) => {
      if (data.success) {
        document.querySelector("#record_success_modal" as any).showModal();
      }
    },
  });

  const handleRecordDiagnosis = () => {
    if (!tempDiagnosis) return;

    execute({
      chatId,
      confidence: tempDiagnosis.confidence,
      disease: tempDiagnosis.disease,
      modelUsed: tempDiagnosis.modelUsed,
      uncertainty: tempDiagnosis.uncertainty,
      symptoms: tempDiagnosis.symptoms,
      messageId: tempDiagnosis.messageId,
    });
  };

  return (
    <button
      disabled={isExecuting || disabled}
      className="flex-1 border border-border btn"
      onClick={handleRecordDiagnosis}
    >
      {isExecuting ? (
        <span className="loading loading-spinner"></span>
      ) : (
        "Record diagnosis"
      )}
    </button>
  );
};

export default RecordDiagnosisBtn;
