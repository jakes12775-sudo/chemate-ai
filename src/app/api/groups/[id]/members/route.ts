import { z } from "zod";
import { authorizeApiRequest } from "@/lib/auth/session";
import { addMembersToGroup } from "@/lib/chemate/service";
import { jsonError, jsonOk } from "@/lib/http";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

const schema = z.object({
  memberUserIds: z.array(z.string().trim().min(1)).min(1).max(20),
});

export async function POST(request: Request, { params }: Params) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonError("Invalid member payload.", 400, parsed.error.issues);
  }

  const { id } = await params;
  const group = await addMembersToGroup({
    actorId: auth.session.user.id,
    groupId: id,
    memberUserIds: parsed.data.memberUserIds,
  });

  if (!group) {
    return jsonError("Group not found.", 404);
  }

  return jsonOk({ group });
}
