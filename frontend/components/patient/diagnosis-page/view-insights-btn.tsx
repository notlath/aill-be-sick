type ViewInsightsBtnProps = {
  disabled: boolean;
};

const ViewInsightsBtn = ({ disabled }: ViewInsightsBtnProps) => {
  const handleViewInsights = () => {
    document.querySelector("#insights_modal" as any).showModal();
  };

  return (
    <div className="flex gap-2 mt-4">
      <button
        disabled={disabled}
        className="flex-1 border border-border btn"
        onClick={handleViewInsights}
      >
        See what influenced this result
      </button>
    </div>
  );
};

export default ViewInsightsBtn;
