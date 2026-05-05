import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { setOAuthState } from "@/lib/auth/oauth";

function getRedirectUri(origin: string) {
  return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
}

export async function GET(request: Request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL("/auth?error=google_not_configured", request.url),
    );
  }

  const state = randomBytes(24).toString("hex");
  await setOAuthState("chemate_google_state", state);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", getRedirectUri(new URL(request.url).origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("access_type", "offline");

  return NextResponse.redirect(url);
}
