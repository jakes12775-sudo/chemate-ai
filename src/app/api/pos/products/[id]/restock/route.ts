import { authorizeApiRequest } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { restockProductRecord } from "@/lib/pos/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const auth = await authorizeApiRequest(["super_admin"]);

  if ("response" in auth) {
    return auth.response;
  }

  const params =
    typeof (context.params as Promise<{ id: string }>).then === "function"
      ? await (context.params as Promise<{ id: string }>)
      : (context.params as { id: string });

  try {
    const result = await restockProductRecord(
      params.id,
      await request.json(),
      auth.session.user,
    );
    return jsonOk(result, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not restock the product.",
      400,
    );
  }
}
