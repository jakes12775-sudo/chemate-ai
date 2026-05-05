import { authorizeApiRequest } from "@/lib/auth/session";
import { buildExamPrediction } from "@/lib/chemate/service";
import { jsonOk } from "@/lib/http";

export async function POST() {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const artifact = await buildExamPrediction(auth.session.user.id);

  return jsonOk({
    artifact,
  });
}
