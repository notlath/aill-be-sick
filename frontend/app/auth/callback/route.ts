import { NextResponse } from "next/server";
import prisma from "@/prisma/prisma";
import { createClient } from "@/utils/supabase/server";

/**
 * OAuth callback route
 * - Exchanges the provider code for a Supabase session (sets cookies)
 * - Fetches the authenticated Supabase user
 * - Upserts the user into the application database via Prisma (sync by authId)
 * - Redirects back to the app (preserves `next` param if provided)
 */
export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");
	let next = searchParams.get("next") ?? "/";
	if (!next.startsWith("/")) next = "/";

	if (code) {
		const supabase = await createClient();

		// Exchange the OAuth code for a session (this will set cookies)
		const { error: exchangeError } =
			await supabase.auth.exchangeCodeForSession(code);

		if (exchangeError) {
			console.error("Error exchanging code for session:", exchangeError);
			return NextResponse.redirect(`${origin}/auth/auth-code-error`);
		}

		try {
			// Get the user for the newly created session (server-side, cookies-aware)
			const {
				data: { user },
				error: getUserError,
			} = await supabase.auth.getUser();

			if (getUserError) {
				console.error("Error fetching user after exchange:", getUserError);
			}

			if (user && user.id) {
				// Upsert into the application's `User` table using Prisma.
				// This assumes your Prisma `User` model has a unique `authId` field.
				// The upsert is idempotent and will create or update the row as needed.
				const upsertData = {
					authId: user.id,
					email: user.email ?? undefined,
					name:
						user.user_metadata?.full_name ??
						user.user_metadata?.name ??
						undefined,
				};

				try {
					await prisma.user.upsert({
						where: { authId: user.id },
						create: {
							authId: upsertData.authId,
							email: upsertData.email ?? "",
							name: upsertData.name ?? null,
						},
						update: {
							// Only update fields that are present to avoid overwriting with undefined
							...(upsertData.email ? { email: upsertData.email } : {}),
							...(upsertData.name ? { name: upsertData.name } : {}),
						},
					});
				} catch (prismaError) {
					// Log but don't block redirect — the auth session is more important.
					console.error("Error upserting user with Prisma:", prismaError);
				}
			}
		} catch (err) {
			console.error("Unexpected error during post-auth processing:", err);
		}

		// Redirect back to the app (preserving forwarded host when behind a proxy)
		const forwardedHost = request.headers.get("x-forwarded-host");
		const isLocalEnv = process.env.NODE_ENV === "development";
		if (isLocalEnv) {
			return NextResponse.redirect(`${origin}${next}`);
		} else if (forwardedHost) {
			return NextResponse.redirect(`https://${forwardedHost}${next}`);
		} else {
			return NextResponse.redirect(`${origin}${next}`);
		}
	}

	// If no code present or something else went wrong, send to an error page
	return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
