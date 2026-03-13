import { Suspense } from "react";
import { getCurrentDbUser } from "@/utils/user";
import ProfileForm from "@/components/patient/profile/profile-form";

async function ProfileData() {
  const { success: dbUser, error } = await getCurrentDbUser();

  if (!dbUser) {
    throw new Error(error || "Failed to load user");
  }

  return (
    <ProfileForm
      user={{
        name: dbUser.name || "",
        email: dbUser.email,
        avatar: dbUser.avatar || null,
        region: dbUser.region || null,
        province: dbUser.province || null,
        city: dbUser.city || null,
        barangay: dbUser.barangay || null,
        address: dbUser.address || null,
        district: dbUser.district || null,
        latitude: dbUser.latitude || null,
        longitude: dbUser.longitude || null,
        gender: dbUser.gender || null,
        birthday: dbUser.birthday ? dbUser.birthday.toISOString().split("T")[0] : null,
      }}
    />
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-10">
      {/* Profile Card Skeleton */}
      <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm overflow-hidden pb-8">
        <div className="h-32 skeleton rounded-none" />
        <div className="px-8 flex flex-col">
          <div className="-mt-16 mb-6">
            <div className="w-32 h-32 rounded-full skeleton border-4 border-white" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2 flex flex-col">
                <div className="h-4 w-16 skeleton" />
                <div className="h-10 w-full skeleton" />
                {i === 2 && <div className="h-3 w-32 skeleton" />}
              </div>
            ))}
            <div className="col-start-2 flex justify-end">
              <div className="h-10 w-[100px] skeleton rounded-[10px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Location Section Skeleton */}
      <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl skeleton" />
          <div className="space-y-2 flex flex-col">
            <div className="h-6 w-24 skeleton" />
            <div className="h-4 w-64 skeleton" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2 flex flex-col">
              <div className="h-4 w-16 skeleton" />
              <div className="h-10 w-full skeleton" />
            </div>
          ))}
          <div className="md:col-span-2 pt-2 flex justify-end">
            <div className="h-10 w-[110px] skeleton rounded-[10px]" />
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <main className="space-y-10 mx-auto p-8 pt-12 max-w-4xl">
      <div className="space-y-2">
        <h1 className="mb-1 font-semibold text-base-content text-4xl tracking-tight">
          Profile Settings
        </h1>
        <p className="text-muted text-lg">
          Manage your personal information and preferences
        </p>
      </div>

      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileData />
      </Suspense>
    </main>
  );
}
