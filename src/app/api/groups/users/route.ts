import { authorizeApiRequest } from "@/lib/auth/session";
import { searchUsersByUsername } from "@/lib/chemate/service";
import { jsonOk } from "@/lib/http";

export async function GET(request: Request) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const users = await searchUsersByUsername(auth.session.user.id, query);

  return jsonOk({ users });
}
