import { CallMode } from "@prisma/client";
import { z } from "zod";
import { authorizeApiRequest } from "@/lib/auth/session";
import { createGroupCallRoom } from "@/lib/chemate/service";
import { jsonError, jsonOk } from "@/lib/http";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

const schema = z.object({
  mode: z.nativeEnum(CallMode),
});

export async function POST(request: Request, { params }: Params) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonError("Invalid call request.", 400, parsed.error.issues);
  }

  const { id } = await params;
  const room = await createGroupCallRoom({
    creatorId: auth.session.user.id,
    groupId: id,
    mode: parsed.data.mode,
  });

  if (!room) {
    return jsonError("Group not found.", 404);
  }

  return jsonOk({ room }, { status: 201 });
}
