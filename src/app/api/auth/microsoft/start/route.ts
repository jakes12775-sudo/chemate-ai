import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { setOAuthState } from "@/lib/auth/oauth";

function getRedirectUri(origin: string) {
  return process.env.MICROSOFT_REDIRECT_URI || `${origin}/api/auth/microsoft/callback`;
}

export async function GET(request: Request) {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/auth?error=microsoft_not_configured", request.url));
  }

  const state = randomBytes(24).toString("hex");
  await setOAuthState("chemate_microsoft_state", state);

  const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", process.env.MICROSOFT_CLIENT_ID);
  url.searchParams.set("redirect_uri", getRedirectUri(new URL(request.url).origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile email User.Read");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(url);
}
