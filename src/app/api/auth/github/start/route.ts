import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { setOAuthState } from "@/lib/auth/oauth";

function getRedirectUri(origin: string) {
  return process.env.GITHUB_REDIRECT_URI || `${origin}/api/auth/github/callback`;
}

export async function GET(request: Request) {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/auth?error=github_not_configured", request.url));
  }

  const state = randomBytes(24).toString("hex");
  await setOAuthState("chemate_github_state", state);

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", getRedirectUri(new URL(request.url).origin));
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url);
}
