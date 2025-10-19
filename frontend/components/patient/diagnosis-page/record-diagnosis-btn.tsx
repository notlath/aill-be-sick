import { createDiagnosis } from "@/actions/create-diagnosis";
import { TempDiagnosis } from "@/app/generated/prisma";
import { useAction } from "next-safe-action/hooks";

type RecordDiagnosisBtnProps = {
  tempDiagnosis?: TempDiagnosis;
  messagesLength: number;
  chatId: string;
  idx?: number;
  disabled?: boolean;
};

const RecordDiagnosisBtn = ({
  tempDiagnosis,
  messagesLength,
  idx,
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
    });
  };

  return (
    <div className="flex gap-2 mt-4">
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
    </div>
  );
};

export default RecordDiagnosisBtn;
