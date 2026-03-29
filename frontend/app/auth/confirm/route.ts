import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import prisma from "@/prisma/prisma";

/**
 * Email verification confirmation route.
 * 
 * This route is called when a user clicks the verification link in their email.
 * It verifies the OTP token and updates the user's emailVerified status in Prisma.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();

    const { error, data } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error && data.user) {
      // Update emailVerified status in Prisma database
      try {
        await prisma.user.update({
          where: { authId: data.user.id },
          data: { emailVerified: true },
        });
        console.log(`[Email Verify] User ${data.user.id} email verified successfully`);
      } catch (prismaError) {
        // Log but don't block - the user is verified in Supabase
        console.error(`[Email Verify] Failed to update emailVerified in Prisma:`, prismaError);
      }

      // Redirect user to specified redirect URL or root of app
      redirect(next);
    }
  }

  // Redirect the user to an error page with some instructions
  redirect("/error");
}
