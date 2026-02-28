import { getCurrentDbUser } from "@/utils/user";
import ProfileForm from "@/components/patient/profile/profile-form";

export default async function ProfilePage() {
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
      }}
    />
  );
}
