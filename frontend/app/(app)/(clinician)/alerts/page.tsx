import AlertsClient from "@/components/clinicians/alerts-page/alerts-client";
import { getOutbreakSummary } from "@/utils/surveillance";

const AlertsPage = async () => {
  const initialData = await getOutbreakSummary();

  if (!initialData) {
    console.error("Failed to fetch outbreak data");

    return (
      <main className="from-base-100 via-base-200/30 to-base-100 min-h-screen bg-gradient-to-br">
        <div className="px-8 pt-12 pb-8 md:px-16 lg:px-24">
          <div className="mx-auto max-w-[1600px]">
            <div className="animate-fade-in space-y-3">
              <h1 className="from-base-content via-base-content to-base-content/70 bg-gradient-to-br bg-clip-text text-6xl font-semibold tracking-tight text-transparent">
                Disease Surveillance
              </h1>
            </div>
          </div>
        </div>
        <div className="px-8 pb-16 md:px-16 lg:px-24">
          <div className="mx-auto max-w-[1600px]">
            <div className="card border-error/20 bg-error/5 border">
              <div className="card-body items-center py-20 text-center">
                <div className="bg-error/10 rounded-2xl p-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-error size-8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h2 className="text-error mt-4 text-xl font-semibold">
                  Unable to Load Surveillance Data
                </h2>
                <p className="text-muted max-w-md text-sm">
                  Could not connect to the surveillance service. Please ensure
                  the backend is running and try again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return <AlertsClient initialData={initialData} />;
};

export default AlertsPage;
