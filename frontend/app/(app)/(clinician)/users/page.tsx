import { columns } from "@/components/clinicians/users-page/columns";
import { DataTable } from "@/components/clinicians/users-page/data-table";
import { getAllUsers } from "@/utils/user";

const UsersPage = async () => {
  const { success: users, error } = await getAllUsers();

  if (error) {
    return <div>Error loading users: {error}</div>;
  }

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
            <DataTable columns={columns} data={users || []} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default UsersPage;
