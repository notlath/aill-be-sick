import { getCurrentDbUser } from "@/utils/user";
import { redirect } from "next/navigation";

const HomePage = async () => {
  const { success: dbUser, error, code } = await getCurrentDbUser();

  if (error) {
    if (code === "NOT_AUTHENTICATED") {
      return redirect("/login");
    }

    if (code === "USER_NOT_FOUND") {
      return redirect("/auth/sync-error");
    }

    // TODO: Error handling for other DB errors
    return <div>Error: {JSON.stringify(error)}</div>;
  }

  if (!dbUser) {
    return redirect("/login");
  }

  if (dbUser.role === "CLINICIAN") {
    return redirect("/dashboard");
  }

  if (dbUser.role === "PATIENT") {
    return redirect("/diagnosis");
  }

  // For DEVELOPER role, redirect to patient view by default
  if (dbUser.role === ("DEVELOPER" as any)) {
    return redirect("/diagnosis");
  }

  return (
    <main className="flex flex-col justify-center items-center h-full">
      <h1>Hello world</h1>
    </main>
  );
};

export default HomePage;
