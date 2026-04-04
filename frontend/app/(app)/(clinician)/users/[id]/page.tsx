import { notFound, redirect } from "next/navigation";
import prisma from "@/prisma/prisma";
import { getCurrentDbUser } from "@/utils/user";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { canCreatePatient, isAdminLike } from "@/utils/role-hierarchy";
import { canRestoreDeletion } from "@/utils/deletion-schedule";
import { UserDetailDangerZone } from "@/components/clinicians/users-page/user-detail-danger-zone";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, Trash2 } from "lucide-react";

async function getUserDetail(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      scheduledDeletion: {
        include: {
          scheduledByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: { diagnoses: true, chats: true },
      },
    },
  });

  return user;
}

const UserDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const userId = parseInt(id, 10);

  if (isNaN(userId)) {
    notFound();
  }

  const { success: dbUser, error } = await getCurrentDbUser();

  if (error || !dbUser) {
    redirect("/login");
  }

  if (!canCreatePatient(dbUser.role)) {
    redirect("/unauthorized");
  }

  const isAdmin = isAdminLike(dbUser.role);

  const user = await getUserDetail(userId);

  if (!user) {
    notFound();
  }

  const deletionSchedule = user.scheduledDeletion;
  const isScheduled = deletionSchedule?.status === "SCHEDULED";
  const canRestore = isScheduled
    ? canRestoreDeletion(dbUser.role, dbUser.id, deletionSchedule.scheduledBy)
    : false;

  return (
    <main className="from-base-100 via-base-200/30 to-base-100 min-h-screen bg-gradient-to-br">
      <div className="px-8 pt-12 pb-8 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px]">
          <div className="animate-fade-in space-y-3">
            <Link href="/users" className="btn btn-ghost btn-sm gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Users
            </Link>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="from-base-content via-base-content to-base-content/70 bg-gradient-to-br bg-clip-text text-6xl font-semibold tracking-tight text-transparent">
                  {user.name || user.email}
                </h1>
                <p className="text-muted text-lg">{user.email}</p>
              </div>
              <Badge
                variant="default"
                className={
                  isScheduled
                    ? "bg-warning text-warning-content"
                    : "bg-success text-success-content"
                }
              >
                {isScheduled ? (
                  <>
                    <Clock className="w-3 h-3 mr-1" />
                    Scheduled for Deletion
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 pb-16 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px] space-y-8">
          {isScheduled && (
            <div className="alert alert-warning border-warning/50 bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <div className="flex-1">
                <h3 className="text-warning font-semibold">
                  Account Scheduled for Deletion
                </h3>
                <div className="text-warning/90 space-y-1 text-sm">
                  <p>
                    This account is scheduled for deletion on{" "}
                    <strong>
                      {new Date(deletionSchedule.scheduledDeletionAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </strong>
                    .
                  </p>
                  {deletionSchedule.reason && (
                    <p>Reason: {deletionSchedule.reason}</p>
                  )}
                  <p>
                    Scheduled by: {deletionSchedule.scheduledByUser.name || deletionSchedule.scheduledByUser.email}
                  </p>
                  <p>
                    The patient can reclaim their account during this period.
                  </p>
                </div>
              </div>
              {canRestore && (
                <UserDetailDangerZone
                  patientId={user.id}
                  scheduledBy={deletionSchedule.scheduledBy}
                  currentUserRole={dbUser.role}
                  currentUserId={dbUser.id}
                  isScheduled={true}
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-muted text-sm">Name</span>
                  <p>{user.name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted text-sm">Email</span>
                  <p>{user.email}</p>
                </div>
                <div>
                  <span className="text-muted text-sm">Role</span>
                  <p>{user.role}</p>
                </div>
                {user.age && (
                  <div>
                    <span className="text-muted text-sm">Age</span>
                    <p>{user.age}</p>
                  </div>
                )}
                {user.gender && (
                  <div>
                    <span className="text-muted text-sm">Gender</span>
                    <p>{user.gender}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-muted text-sm">District</span>
                  <p>{user.district || "—"}</p>
                </div>
                <div>
                  <span className="text-muted text-sm">City</span>
                  <p>{user.city || "—"}</p>
                </div>
                <div>
                  <span className="text-muted text-sm">Region</span>
                  <p>{user.region || "—"}</p>
                </div>
                <div>
                  <span className="text-muted text-sm">Province</span>
                  <p>{user.province || "—"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-muted text-sm">Symptom Checks</span>
                  <p>{user._count.diagnoses}</p>
                </div>
                <div>
                  <span className="text-muted text-sm">Chats</span>
                  <p>{user._count.chats}</p>
                </div>
                <div>
                  <span className="text-muted text-sm">Joined</span>
                  <p>
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {!isScheduled && isAdmin && (
            <Card className="border-error/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="from-error/10 to-error/5 p-3 rounded-[12px]">
                    <Trash2 className="w-6 h-6 text-error" />
                  </div>
                  <div>
                    <CardTitle className="text-error">Danger Zone</CardTitle>
                    <CardDescription>
                      Permanently delete and anonymize this patient&apos;s account.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <UserDetailDangerZone
                  patientId={user.id}
                  scheduledBy={dbUser.id}
                  currentUserRole={dbUser.role}
                  currentUserId={dbUser.id}
                  isScheduled={false}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
};

export default UserDetailPage;
