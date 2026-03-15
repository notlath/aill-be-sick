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
        title="Discard this diagnosis without saving it to your record"
      >
        {isExecuting ? (
          <span className="loading loading-spinner"></span>
        ) : (
          "Discard diagnosis"
        )}
      </button>

      {/* Success Modal */}
      <dialog id="discard_success_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg text-success">
            Diagnosis Discarded
          </h3>
          <p className="py-4">
            The diagnosis has been discarded and will not be saved to your
            medical record. You can start a new diagnosis session if needed.
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
            Unable to discard the diagnosis. This may happen if the diagnosis
            has already been recorded or if there was a technical error.
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
