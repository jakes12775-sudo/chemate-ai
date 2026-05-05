import { authorizeApiRequest } from "@/lib/auth/session";
import { buildSummaryArtifact } from "@/lib/chemate/service";
import { jsonError, jsonOk } from "@/lib/http";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, { params }: Params) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const artifact = await buildSummaryArtifact(auth.session.user.id, id);

  if (!artifact) {
    return jsonError("Upload not found.", 404);
  }

  return jsonOk({
    artifact,
  });
}
