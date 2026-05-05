import { NextResponse } from "next/server";
import { clearOAuthState, findOrCreateOAuthUser, getOAuthState } from "@/lib/auth/oauth";
import { createUserSession } from "@/lib/auth/session";
import { updateLastLogin } from "@/lib/chemate/service";

function getRedirectUri(origin: string) {
  return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const savedState = await getOAuthState("chemate_google_state");

  if (error) {
    return NextResponse.redirect(new URL(`/auth?error=${error}`, request.url));
  }

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/auth?error=google_state_mismatch", request.url));
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL("/auth?error=google_not_configured", request.url),
    );
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getRedirectUri(requestUrl.origin),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/auth?error=google_token_exchange", request.url));
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
  };

  if (!tokenPayload.access_token) {
    return NextResponse.redirect(new URL("/auth?error=google_userinfo_missing", request.url));
  }

  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });

  if (!userInfoResponse.ok) {
    return NextResponse.redirect(new URL("/auth?error=google_userinfo_failed", request.url));
  }

  const profile = (await userInfoResponse.json()) as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  };

  const user = await findOrCreateOAuthUser({
    provider: "google",
    providerUserId: profile.sub,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.picture,
  });

  await updateLastLogin(user.id);
  await createUserSession(user.id);
  await clearOAuthState("chemate_google_state");

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
