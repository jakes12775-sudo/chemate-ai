import { authorizeApiRequest } from "@/lib/auth/session";
import { clearArtifactsForUser, listRecentArtifactsForUser } from "@/lib/chemate/service";
import { jsonOk } from "@/lib/http";

export async function GET() {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const answers = await listRecentArtifactsForUser(auth.session.user.id, "answer");

  return jsonOk({ answers });
}

export async function DELETE() {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  await clearArtifactsForUser(auth.session.user.id, "answer");

  return jsonOk({ ok: true });
}
