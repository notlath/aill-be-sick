import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAuthUser } from "@/utils/user";

const Layout = async ({ children }: { children: ReactNode }) => {
	const authUser = await getAuthUser();

	if (authUser) return redirect("/");

	return <>{children}</>;
};

export default Layout;
