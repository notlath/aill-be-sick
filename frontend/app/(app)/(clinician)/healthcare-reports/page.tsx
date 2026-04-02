import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReportsContent from "@/components/clinicians/healthcare-reports-page/reports-content";
import VerificationsContent from "@/components/clinicians/healthcare-reports-page/verifications-content";

export default function HealthcareReports() {
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
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="verifications">Verifications</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reports">
              <ReportsContent />
            </TabsContent>
            
            <TabsContent value="verifications">
              <VerificationsContent />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
