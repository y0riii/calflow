import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/authentication";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const clientId = process.env.ZOOM_CLIENT_ID;
    if (!clientId) {
      console.error("ZOOM_CLIENT_ID is not configured.");
      return NextResponse.redirect(new URL("/profile?error=ZoomNotConfigured", request.url));
    }

    // Must exactly match the URI registered in Zoom Developer Console
    const appUrl = process.env.MAIN_APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl}/api/auth/zoom/callback`;

    // Use URLSearchParams for proper encoding — avoids slash/encoding mismatches
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
    });

    const zoomAuthUrl = `https://zoom.us/oauth/authorize?${params.toString()}`;

    return NextResponse.redirect(zoomAuthUrl);
  } catch (error) {
    console.error("Error initiating Zoom OAuth:", error);
    return NextResponse.redirect(new URL("/profile?error=ServerError", request.url));
  }
}
