import { NextResponse } from "next/server";
import { clearOAuthState, findOrCreateOAuthUser, getOAuthState } from "@/lib/auth/oauth";
import { createUserSession } from "@/lib/auth/session";
import { updateLastLogin } from "@/lib/chemate/service";

function getRedirectUri(origin: string) {
  return process.env.GITHUB_REDIRECT_URI || `${origin}/api/auth/github/callback`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const savedState = await getOAuthState("chemate_github_state");

  if (error) {
    return NextResponse.redirect(new URL(`/auth?error=${error}`, request.url));
  }

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/auth?error=github_state_mismatch", request.url));
  }

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/auth?error=github_not_configured", request.url));
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      redirect_uri: getRedirectUri(requestUrl.origin),
      state,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/auth?error=github_token_exchange", request.url));
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
  };

  if (!tokenPayload.access_token) {
    return NextResponse.redirect(new URL("/auth?error=github_access_token_missing", request.url));
  }

  const headers = {
    Authorization: `Bearer ${tokenPayload.access_token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "Chemate-AI",
  };

  const userResponse = await fetch("https://api.github.com/user", { headers });

  if (!userResponse.ok) {
    return NextResponse.redirect(new URL("/auth?error=github_userinfo_failed", request.url));
  }

  const profile = (await userResponse.json()) as {
    id: number;
    login: string;
    name?: string;
    avatar_url?: string;
    email?: string | null;
  };

  let email = profile.email ?? "";

  if (!email) {
    const emailResponse = await fetch("https://api.github.com/user/emails", { headers });

    if (emailResponse.ok) {
      const emails = (await emailResponse.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      email =
        emails.find((item) => item.primary && item.verified)?.email ??
        emails.find((item) => item.verified)?.email ??
        "";
    }
  }

  if (!email) {
    return NextResponse.redirect(new URL("/auth?error=github_email_missing", request.url));
  }

  const user = await findOrCreateOAuthUser({
    provider: "github",
    providerUserId: String(profile.id),
    email,
    name: profile.name ?? profile.login,
    avatarUrl: profile.avatar_url,
  });

  await updateLastLogin(user.id);
  await createUserSession(user.id);
  await clearOAuthState("chemate_github_state");

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
