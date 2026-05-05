import { z } from "zod";
import { authorizeApiRequest } from "@/lib/auth/session";
import { getGroupDetailForUser, postGroupMessage } from "@/lib/chemate/service";
import { jsonError, jsonOk } from "@/lib/http";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

const schema = z.object({
  content: z.string().trim().min(1).max(2400),
});

export async function GET(_: Request, { params }: Params) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const group = await getGroupDetailForUser(auth.session.user.id, id);

  if (!group) {
    return jsonError("Group not found.", 404);
  }

  return jsonOk({ messages: group.messages });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonError("Invalid discussion message.", 400, parsed.error.issues);
  }

  const { id } = await params;
  const message = await postGroupMessage({
    authorId: auth.session.user.id,
    groupId: id,
    content: parsed.data.content,
  });

  if (!message) {
    return jsonError("Group not found.", 404);
  }

  return jsonOk({ message }, { status: 201 });
}
