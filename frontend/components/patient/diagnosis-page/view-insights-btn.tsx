type ViewInsightsBtnProps = {
  disabled: boolean;
  modalId: string;
};

const ViewInsightsBtn = ({ disabled, modalId }: ViewInsightsBtnProps) => {
  const handleViewInsights = () => {
    const modal = document.getElementById(modalId) as HTMLDialogElement | null;
    modal?.showModal();
  };

  return (
    <div className="flex-1 shrink-0">
      <button
        disabled={disabled}
        type="button"
        className="btn btn-outline border-border bg-base-200 w-full shrink-0"
        onClick={handleViewInsights}
      >
        View insights
      </button>
    </div>
  );
};

export default ViewInsightsBtn;
