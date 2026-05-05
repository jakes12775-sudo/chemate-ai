import { authorizeApiRequest } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { createProductRecord } from "@/lib/pos/service";

export async function POST(request: Request) {
  const auth = await authorizeApiRequest(["super_admin"]);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const result = await createProductRecord(
      await request.json(),
      auth.session.user,
    );
    return jsonOk(result, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not create the product.",
      400,
    );
  }
}
