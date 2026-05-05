import { AiProvider } from "@prisma/client";
import { z } from "zod";
import { authorizeApiRequest } from "@/lib/auth/session";
import { updateUserPreferences } from "@/lib/chemate/service";
import { jsonError, jsonOk } from "@/lib/http";

const schema = z.object({
  preferredTheme: z.enum(["light", "dark", "system"]).optional(),
  preferredAi: z.nativeEnum(AiProvider).optional(),
  school: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2).max(80).optional(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
});

export async function PATCH(request: Request) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonError("Invalid settings update.", 400, parsed.error.issues);
  }

  const user = await updateUserPreferences(auth.session.user.id, parsed.data);

  return jsonOk({
    user,
  });
}
