import { NextResponse } from "next/server";
import { clearOAuthState, findOrCreateOAuthUser, getOAuthState } from "@/lib/auth/oauth";
import { createUserSession } from "@/lib/auth/session";
import { updateLastLogin } from "@/lib/chemate/service";

function getRedirectUri(origin: string) {
  return process.env.MICROSOFT_REDIRECT_URI || `${origin}/api/auth/microsoft/callback`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const savedState = await getOAuthState("chemate_microsoft_state");

  if (error) {
    return NextResponse.redirect(new URL(`/auth?error=${error}`, request.url));
  }

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/auth?error=microsoft_state_mismatch", request.url));
  }

  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/auth?error=microsoft_not_configured", request.url));
  }

  const tokenResponse = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        redirect_uri: getRedirectUri(requestUrl.origin),
        grant_type: "authorization_code",
      }),
    },
  );

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/auth?error=microsoft_token_exchange", request.url));
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
  };

  if (!tokenPayload.access_token) {
    return NextResponse.redirect(new URL("/auth?error=microsoft_access_token_missing", request.url));
  }

  const profileResponse = await fetch(
    "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName",
    {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
      },
    },
  );

  if (!profileResponse.ok) {
    return NextResponse.redirect(new URL("/auth?error=microsoft_userinfo_failed", request.url));
  }

  const profile = (await profileResponse.json()) as {
    id: string;
    displayName?: string;
    mail?: string | null;
    userPrincipalName?: string;
  };

  const email = profile.mail || profile.userPrincipalName;

  if (!email) {
    return NextResponse.redirect(new URL("/auth?error=microsoft_email_missing", request.url));
  }

  const user = await findOrCreateOAuthUser({
    provider: "microsoft",
    providerUserId: profile.id,
    email,
    name: profile.displayName ?? email.split("@")[0],
  });

  await updateLastLogin(user.id);
  await createUserSession(user.id);
  await clearOAuthState("chemate_microsoft_state");

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
