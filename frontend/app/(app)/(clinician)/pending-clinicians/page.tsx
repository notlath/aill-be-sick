import PendingClinicianActions from "@/components/clinicians/users-page/pending-clinician-actions";
import prisma from "@/prisma/prisma";
import { getCurrentDbUser } from "@/utils/user";
import { canApproveClinicians } from "@/utils/role-hierarchy";
import { redirect } from "next/navigation";

const PendingCliniciansPage = async () => {
  const { success: dbUser, error, code } = await getCurrentDbUser();

  if (error) {
    if (code === "NOT_AUTHENTICATED") {
      redirect("/admin-login");
    }

    redirect("/");
  }

  if (!dbUser) {
    redirect("/admin-login");
  }

  if (!canApproveClinicians(dbUser.role)) {
    redirect("/");
  }

  const pendingClinicians = await prisma.user.findMany({
    where: {
      role: "CLINICIAN",
      approvalStatus: "PENDING_ADMIN_APPROVAL",
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-base-100 px-4 py-6 md:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div>
          <h1 className="text-3xl font-semibold">
            Pending Clinician Approvals
          </h1>
          <p className="text-sm text-muted">
            Review clinician signups and approve or reject access.
          </p>
        </div>

        {pendingClinicians.length === 0 ? (
          <div className="alert alert-info">
            <span>No clinicians are waiting for approval.</span>
          </div>
        ) : (
          <div className="overflow-x-auto border border-base-300 rounded-xl bg-base-100">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Submitted</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingClinicians.map((clinician) => (
                  <tr key={clinician.id}>
                    <td>{clinician.name || "-"}</td>
                    <td>{clinician.email}</td>
                    <td>{new Date(clinician.createdAt).toLocaleString()}</td>
                    <td>
                      <PendingClinicianActions clinicianUserId={clinician.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
};

export default PendingCliniciansPage;
