import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/authentication";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.ZOOM_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/zoom/callback`;

  const authUrl = new URL("https://zoom.us/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId || "");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);

  return NextResponse.redirect(authUrl.toString());
}
