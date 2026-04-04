import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReportsContent from "@/components/clinicians/healthcare-reports-page/reports-content";
import VerificationsContent from "@/components/clinicians/healthcare-reports-page/verifications-content";
import InconclusiveContent from "@/components/clinicians/healthcare-reports-page/inconclusive-content";
import RejectedContent from "@/components/clinicians/healthcare-reports-page/rejected-content";
import { getPendingDiagnosesCount } from "@/utils/diagnosis";
import { getInconclusiveDiagnosesCount } from "@/utils/diagnosis";
import { getRejectedDiagnosesCount } from "@/utils/diagnosis";
import { getTotalDiagnosesCount } from "@/utils/diagnosis";

export default async function HealthcareReports() {
  const [
    { success: totalCount },
    { success: pendingCount },
    { success: inconclusiveCount },
    { success: rejectedCount },
  ] = await Promise.all([
    getTotalDiagnosesCount(),
    getPendingDiagnosesCount(),
    getInconclusiveDiagnosesCount(),
    getRejectedDiagnosesCount(),
  ]);

  const reportsCount = totalCount ?? 0;
  const verificationsCount = pendingCount ?? 0;
  const inconclusiveCountNum = inconclusiveCount ?? 0;
  const rejectedCountNum = rejectedCount ?? 0;

  return (
    <main className="from-base-100 via-base-200/30 to-base-100 min-h-screen bg-gradient-to-br">
      {/* Hero Header Section */}
      <div className="px-8 pt-12 pb-8 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px]">
          <div className="animate-fade-in space-y-3">
            <h1 className="from-base-content via-base-content to-base-content/70 bg-gradient-to-br bg-clip-text text-6xl font-semibold tracking-tight text-transparent">
              Healthcare Reports
            </h1>
            <p className="text-muted text-lg">
              View and manage healthcare reports and diagnosis verifications
            </p>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="px-8 pb-16 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <Tabs defaultValue="reports" className="w-full">
            <TabsList>
              <TabsTrigger value="reports" className="gap-2 relative">
                Reports
                <span className={`inline-flex items-center justify-center px-1.5 min-w-5 h-5 rounded-full text-xs font-semibold ${"bg-base-200/50 text-base-content/50"}`}>
                  {reportsCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="verifications" className="gap-2 relative">
                Verifications
                <span className={`inline-flex items-center justify-center px-1.5 min-w-5 h-5 rounded-full text-xs font-semibold ${"bg-base-200/50 text-base-content/50"}`}>
                  {verificationsCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2 relative">
                Rejected
                <span className={`inline-flex items-center justify-center px-1.5 min-w-5 h-5 rounded-full text-xs font-semibold ${"bg-base-200/50 text-base-content/50"}`}>
                  {rejectedCountNum}
                </span>
              </TabsTrigger>
              <TabsTrigger value="inconclusive" className="gap-2 relative">
                Inconclusive
                <span className={`inline-flex items-center justify-center px-1.5 min-w-5 h-5 rounded-full text-xs font-semibold ${"bg-base-200/50 text-base-content/50"}`}>
                  {inconclusiveCountNum}
                </span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="reports">
              <ReportsContent />
            </TabsContent>
            
            <TabsContent value="verifications">
              <VerificationsContent />
            </TabsContent>
            
            <TabsContent value="rejected">
              <RejectedContent />
            </TabsContent>
            
            <TabsContent value="inconclusive">
              <InconclusiveContent />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
