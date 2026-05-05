import { authorizeApiRequest } from "@/lib/auth/session";
import { jsonOk } from "@/lib/http";

export async function GET() {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  return jsonOk({
    user: auth.session.user,
    expiresAt: auth.session.expiresAt.toISOString(),
  });
}
