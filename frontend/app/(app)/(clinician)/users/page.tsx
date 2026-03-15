import { Suspense } from "react";
import { columns, UserRow } from "@/components/clinicians/users-page/columns";
import { DataTable } from "@/components/clinicians/users-page/data-table";
import { getAllUsers, getCurrentDbUser } from "@/utils/user";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { PdfColumn } from "@/utils/pdf-export";

function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search Bar Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="skeleton h-10 w-full sm:w-72 rounded-lg" />
        <div className="flex flex-wrap items-center gap-2">
          <div className="skeleton h-10 w-[160px] rounded-lg" />
          <div className="skeleton h-10 w-[140px] rounded-lg" />
          <div className="skeleton h-10 w-[140px] rounded-lg" />
        </div>
      </div>
      {/* Table Skeleton */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="h-12 border-b border-border bg-base-200/50" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 border-b border-border/50 px-6 py-4 flex items-center justify-between">
            <div className="skeleton h-5 w-1/4" />
            <div className="skeleton h-5 w-1/4" />
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-8 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function UsersTable({ currentUserRole }: { currentUserRole: string }) {
  const { success: users, error } = await getAllUsers(currentUserRole);

  if (error) {
    throw new Error(error);
  }

  const pdfColumns: PdfColumn[] = [
    { header: "Name", dataKey: "name" },
    { header: "Email", dataKey: "email" },
    { header: "Age", dataKey: "age" },
    { header: "Gender", dataKey: "gender" },
    { header: "District", dataKey: "district" },
    { header: "Symptom Checks", dataKey: "diagnoses" },
    { header: "Last Activity", dataKey: "lastActivityAt" },
    { header: "Joined", dataKey: "createdAt" },
  ];

  const exportData = (users || []).map((user) => ({
    name: user.name || "-",
    email: user.email,
    age: user.age ?? "-",
    gender: user.gender || "-",
    district: user.district || "-",
    diagnoses: user._count.diagnoses,
    lastActivityAt: user.lastActivityAt ? new Date(user.lastActivityAt) : "-",
    createdAt: new Date(user.createdAt),
  }));

  return (
    <DataTable 
      columns={columns} 
      data={users || []} 
      currentUserRole={currentUserRole}
      additionalActions={
        <ExportPdfButton
          data={exportData}
          columns={pdfColumns}
          filename="users-report"
          title="Users Report"
          subtitle="All registered users"
        />
      }
    />
  );
}

const UsersPage = async () => {
  const { success: dbUser } = await getCurrentDbUser();
  const currentUserRole = dbUser?.role || "";

  return (
    <main className="from-base-100 via-base-200/30 to-base-100 min-h-screen bg-gradient-to-br">
      {/* Hero Header Section */}
      <div className="px-8 pt-12 pb-8 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px]">
          <div className="animate-fade-in space-y-3">
            <h1 className="from-base-content via-base-content to-base-content/70 bg-gradient-to-br bg-clip-text text-6xl font-semibold tracking-tight text-transparent">
              Users
            </h1>
            <p className="text-muted text-lg">
              All users who have used the system
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 pb-16 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px] space-y-8">
          <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <Suspense fallback={<UsersTableSkeleton />}>
              <UsersTable currentUserRole={currentUserRole} />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
};

export default UsersPage;
