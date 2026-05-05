import { z } from "zod";
import { createUserSession, getHomeRouteForRole } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { createStudentUser, getUserByEmail, updateLastLogin } from "@/lib/chemate/service";
import { jsonError, jsonOk } from "@/lib/http";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  school: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonError("Invalid registration details.", 400, parsed.error.issues);
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await getUserByEmail(email);

  if (existing) {
    return jsonError("An account with that email already exists.", 409);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await createStudentUser({
    name: parsed.data.name,
    email,
    username: parsed.data.username,
    passwordHash,
    school: parsed.data.school,
  });

  await updateLastLogin(user.id);
  await createUserSession(user.id);

  return jsonOk({
    redirectTo: getHomeRouteForRole(user.role),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
    },
  });
}
