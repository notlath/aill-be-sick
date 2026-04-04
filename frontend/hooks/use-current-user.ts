import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export interface CurrentUserInfo {
  name: string;
  email?: string;
}

/**
 * Hook that fetches the current authenticated user's name and email from Supabase.
 * Returns undefined while loading or if not authenticated, or the user info.
 */
export function useCurrentUser(): CurrentUserInfo | undefined {
  const [userInfo, setUserInfo] = useState<CurrentUserInfo | undefined>(undefined);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserInfo(undefined);
        return;
      }

      const name =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Unknown User";

      setUserInfo({ name, email: user.email ?? undefined });
    };

    fetchUser();
  }, []);

  return userInfo;
}
