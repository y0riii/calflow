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

  const clientId = process.env.ZOOM_CLIENT_ID || "";
  const clientSecret = process.env.ZOOM_CLIENT_SECRET || "";
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/zoom/callback`;

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const tokenResponse = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Zoom token error:", tokenData);
      return NextResponse.redirect(new URL("/profile?error=ZoomAuthFailed", request.url));
    }

    if (tokenData.refresh_token) {
      // Upsert the OAuth account
      await prisma.oauthAccount.upsert({
        where: {
          userId_provider: {
            userId: parseInt(user.id),
            provider: "zoom",
          },
        },
        update: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
        },
        create: {
          userId: parseInt(user.id),
          provider: "zoom",
          providerAccountId: "zoom",
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
        },
      });
    }

    return NextResponse.redirect(new URL("/profile", request.url));
  } catch (err) {
    console.error("Zoom callback error:", err);
    return NextResponse.redirect(new URL("/profile?error=ServerError", request.url));
  }
}
