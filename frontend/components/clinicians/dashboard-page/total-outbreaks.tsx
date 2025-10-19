import { TriangleAlert } from "lucide-react";

const TotalOutbreaks = () => {
  return (
    <article className="flex flex-1 items-center gap-4 bg-base-100 px-8 py-10 border border-border rounded-xl">
      <div className="bg-red-900/5 p-4 rounded-full w-max">
        <TriangleAlert className="stroke-[1.5] size-8 text-red-700" />
      </div>
      <div className="space-y-1">
        <h3 className="font-mono font-semibold text-3xl">171</h3>
        <p className="text-muted">Total outbreaks</p>
      </div>
    </article>
  );
};

export default TotalOutbreaks;
