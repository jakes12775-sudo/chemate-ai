import { z } from "zod";
import { createUserSession, getHomeRouteForRole } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { updateLastLogin } from "@/lib/chemate/service";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonError("Invalid login credentials.", 400, parsed.error.issues);
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordHash: true,
      isActive: true,
    },
  });

  if (
    !user ||
    !user.passwordHash ||
    !user.isActive ||
    getHomeRouteForRole(user.role) === "/auth"
  ) {
    return jsonError("Invalid email or password.", 401);
  }

  const passwordMatches = await verifyPassword(
    parsed.data.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return jsonError("Invalid email or password.", 401);
  }

  await updateLastLogin(user.id);

  await createUserSession(user.id);

  return jsonOk({
    redirectTo: getHomeRouteForRole(user.role),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
