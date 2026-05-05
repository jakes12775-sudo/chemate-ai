import { cookies } from "next/headers";
import { createStudentUser } from "@/lib/chemate/service";
import { prisma } from "@/lib/prisma";

type OAuthProvider = "google" | "github" | "microsoft";

export async function setOAuthState(cookieName: string, state: string) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function getOAuthState(cookieName: string) {
  const cookieStore = await cookies();
  return cookieStore.get(cookieName)?.value;
}

export async function clearOAuthState(cookieName: string) {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function findOrCreateOAuthUser(args: {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}) {
  const email = args.email.toLowerCase();
  const providerWhere =
    args.provider === "google"
      ? { googleId: args.providerUserId }
      : args.provider === "github"
        ? { githubId: args.providerUserId }
        : { microsoftId: args.providerUserId };

  let user = await prisma.user.findFirst({
    where: {
      OR: [providerWhere, { email }],
    },
  });

  if (!user) {
    return createStudentUser({
      name: args.name ?? email.split("@")[0] ?? "Chemate Student",
      email,
      provider: args.provider,
      googleId: args.provider === "google" ? args.providerUserId : undefined,
      githubId: args.provider === "github" ? args.providerUserId : undefined,
      microsoftId: args.provider === "microsoft" ? args.providerUserId : undefined,
      avatarUrl: args.avatarUrl,
    });
  }

  if (
    (args.provider === "google" && user.googleId !== args.providerUserId) ||
    (args.provider === "github" && user.githubId !== args.providerUserId) ||
    (args.provider === "microsoft" && user.microsoftId !== args.providerUserId) ||
    user.provider !== args.provider ||
    (!!args.avatarUrl && user.avatarUrl !== args.avatarUrl)
  ) {
    user = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        provider: args.provider,
        googleId: args.provider === "google" ? args.providerUserId : user.googleId,
        githubId: args.provider === "github" ? args.providerUserId : user.githubId,
        microsoftId: args.provider === "microsoft" ? args.providerUserId : user.microsoftId,
        avatarUrl: args.avatarUrl ?? user.avatarUrl,
      },
    });
  }

  return user;
}
