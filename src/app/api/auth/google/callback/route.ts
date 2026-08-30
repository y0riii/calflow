import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/authentication";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/profile?error=NoCode", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`;

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Google token error:", tokenData);
      return NextResponse.redirect(new URL("/profile?error=GoogleAuthFailed", request.url));
    }

    if (tokenData.refresh_token) {
      // Upsert the OAuth account
      await prisma.oauthAccount.upsert({
        where: {
          userId_provider: {
            userId: parseInt(user.id),
            provider: "google",
          },
        },
        update: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
        },
        create: {
          userId: parseInt(user.id),
          provider: "google",
          providerAccountId: "google", // Since we just need it for calendar, we don't strictly need their Google ID
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
        },
      });
    }

    return NextResponse.redirect(new URL("/profile", request.url));
  } catch (err) {
    console.error("Callback error:", err);
    return NextResponse.redirect(new URL("/profile?error=ServerError", request.url));
  }
}
