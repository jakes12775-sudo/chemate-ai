import { createHash, randomBytes } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "chemate_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
type AppRole = "super_admin" | "cashier" | "student" | "mentor";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  preferredTheme?: string;
  preferredAi?: string;
};

function hasAllowedRole(role: UserRole | string, allowedRoles?: AppRole[]) {
  if (!allowedRoles?.length) {
    return getHomeRouteForRole(role) !== "/auth";
  }

  return allowedRoles.includes(role as AppRole);
}

function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionCookieConfig(expiresAt: Date) {
  return {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function getHomeRouteForRole(role: UserRole | string) {
  if (role === "student" || role === "mentor" || role === "super_admin") {
    return "/dashboard";
  }

  if (role === "cashier") {
    return "/dashboard";
  }

  return "/auth";
}

export async function createUserSession(userId: string) {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.$transaction([
    prisma.session.deleteMany({
      where: {
        userId,
      },
    }),
    prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieConfig(expiresAt));

  return expiresAt;
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (currentToken) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(currentToken),
      },
    });
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieConfig(new Date(0)),
    expires: new Date(0),
  });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!currentToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(currentToken),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          preferredTheme: true,
          preferredAi: true,
          isActive: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date() || !session.user.isActive) {
    await prisma.session.deleteMany({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  if (!hasAllowedRole(session.user.role)) {
    return null;
  }

  return {
    id: session.id,
    expiresAt: session.expiresAt,
    user: session.user as SessionUser,
  };
}

export async function redirectIfAuthenticated() {
  const session = await getCurrentSession();

  if (session) {
    redirect(getHomeRouteForRole(session.user.role));
  }
}

export async function requirePageSession(allowedRoles?: AppRole[]) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/auth");
  }

  if (!hasAllowedRole(session.user.role, allowedRoles)) {
    redirect(getHomeRouteForRole(session.user.role));
  }

  return session;
}

export async function authorizeApiRequest(allowedRoles?: AppRole[]) {
  const session = await getCurrentSession();

  if (!session) {
    return {
      response: jsonError("Authentication required.", 401),
    } as const;
  }

  if (!hasAllowedRole(session.user.role, allowedRoles)) {
    return {
      response: jsonError("You do not have permission to access this resource.", 403),
    } as const;
  }

  return {
    session,
  } as const;
}
