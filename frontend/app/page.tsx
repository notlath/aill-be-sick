import { getCurrentDbUser } from "@/utils/user";
import { redirect } from "next/navigation";

const HomePage = async () => {
  const { success: dbUser, error } = await getCurrentDbUser();

  if (!dbUser) {
    return redirect("/login");
  }

  if (error) {
    // TODO: Error handling
    return <div>Error: {JSON.stringify(error)}</div>;
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
