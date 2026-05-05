import { StudyGroupVisibility } from "@prisma/client";
import { z } from "zod";
import { authorizeApiRequest } from "@/lib/auth/session";
import { createStudyGroup, listGroupsForUser } from "@/lib/chemate/service";
import { jsonError, jsonOk } from "@/lib/http";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  topic: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional(),
  visibility: z.nativeEnum(StudyGroupVisibility).optional(),
  memberUserIds: z.array(z.string().trim().min(1)).max(20).optional(),
});

export async function GET() {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const groups = await listGroupsForUser(auth.session.user.id);

  return jsonOk({ groups });
}

export async function POST(request: Request) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonError("Invalid group payload.", 400, parsed.error.issues);
  }

  const group = await createStudyGroup({
    ownerId: auth.session.user.id,
    name: parsed.data.name,
    topic: parsed.data.topic,
    description: parsed.data.description,
    visibility: parsed.data.visibility,
    memberUserIds: parsed.data.memberUserIds,
  });

  return jsonOk({ group }, { status: 201 });
}
