import { discardDiagnosis } from "@/actions/discard-diagnosis";
import { useAction } from "next-safe-action/hooks";

type DiscardDiagnosisBtnProps = {
  chatId: string;
  disabled?: boolean;
};

const DiscardDiagnosisBtn = ({ chatId, disabled }: DiscardDiagnosisBtnProps) => {
  const { execute, isExecuting } = useAction(discardDiagnosis, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        document.querySelector("#discard_success_modal" as any).showModal();
      } else if (data?.error) {
        console.error("[DiscardDiagnosisBtn] Error:", data.error);
        document.querySelector("#discard_error_modal" as any).showModal();
      }
    },
    onError: ({ error }) => {
      console.error("[DiscardDiagnosisBtn] Request failed:", error);
      document.querySelector("#discard_error_modal" as any).showModal();
    },
  });

  const handleDiscardDiagnosis = () => {
    execute({ chatId });
  };

  return (
    <>
      <button
        disabled={isExecuting || disabled}
        className="flex-1 border border-error text-error btn btn-outline hover:bg-error hover:text-error-content"
        onClick={handleDiscardDiagnosis}
        title="Discard this result without saving it to your record"
      >
        {isExecuting ? (
          <span className="loading loading-spinner"></span>
        ) : (
          "Don't save"
        )}
      </button>

      {/* Success Modal */}
      <dialog id="discard_success_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg text-success">
            Result Discarded
          </h3>
          <p className="py-4">
            This result has been discarded and will not be saved to your
            record. You can start a new symptom check if needed.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-success">OK</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Error Modal */}
      <dialog id="discard_error_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg text-error">
            Failed to Discard
          </h3>
          <p className="py-4">
            Unable to discard this result. This may happen if the result
            has already been saved or if there was a technical error.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
};

export default DiscardDiagnosisBtn;
