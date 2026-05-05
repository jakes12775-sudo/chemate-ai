import { AiProvider } from "@prisma/client";
import { z } from "zod";
import { authorizeApiRequest } from "@/lib/auth/session";
import { answerQuestion } from "@/lib/chemate/assistant";
import { jsonError, jsonOk } from "@/lib/http";

const answerSchema = z.object({
  question: z.string().trim().min(4).max(2400),
  allowExternal: z.boolean().optional(),
  preferredProvider: z.nativeEnum(AiProvider).optional(),
});

export async function POST(request: Request) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const parsed = answerSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonError("Invalid answer request.", 400, parsed.error.issues);
  }

  const response = await answerQuestion({
    userId: auth.session.user.id,
    question: parsed.data.question,
    allowExternal: parsed.data.allowExternal,
    preferredProvider: parsed.data.preferredProvider,
  });

  return jsonOk(response);
}
