type ViewSelectProps = {
  value: "coordinates" | "district";
  onValueChange: (value: "coordinates" | "district") => void;
  className?: string;
};

const ViewSelect = ({ value, onValueChange, className }: ViewSelectProps) => {
  const isDistrictView = value === "district";
  const activeLabel = isDistrictView ? "District view" : "Coordinates view";

  return (
    <label className={`label cursor-pointer gap-3 ${className ?? ""}`}>
      <span className="label-text font-medium">{activeLabel}</span>
      <input
        type="checkbox"
        className="toggle toggle-primary"
        checked={isDistrictView}
        onChange={(event) =>
          onValueChange(event.target.checked ? "district" : "coordinates")
        }
        aria-label="Toggle between coordinates and district view"
      />
    </label>
  );
};

export default ViewSelect;
