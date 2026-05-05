import { authorizeApiRequest } from "@/lib/auth/session";
import { getGroupDetailForUser } from "@/lib/chemate/service";
import { jsonError, jsonOk } from "@/lib/http";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

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

  return jsonOk({ group });
}
