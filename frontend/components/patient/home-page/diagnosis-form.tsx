import { ArrowUp } from "lucide-react";

const DiagnosisForm = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <form>
        <div className="space-y-16 w-[800px] text-center">
          <div className="space-y-4">
            <h1 className="font-semibold text-5xl text-center">
              How are you feeling today?
            </h1>
            <p className="text-muted">Describe your symptoms</p>
          </div>
          <div className="flex justify-between items-start shadow-2xl/10 py-3 w-full h-auto input">
            <textarea
              className="flex-1 pl-1 border-none outline-none"
              placeholder="I'm feeling..."
            />
            <button className="p-0 w-10 h-10 aspect-square btn btn-primary">
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default DiagnosisForm;
