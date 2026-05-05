import { authorizeApiRequest } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { returnLeaseTransaction } from "@/lib/pos/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const auth = await authorizeApiRequest(["cashier", "super_admin"]);

  if ("response" in auth) {
    return auth.response;
  }

  const params =
    typeof (context.params as Promise<{ id: string }>).then === "function"
      ? await (context.params as Promise<{ id: string }>)
      : (context.params as { id: string });

  try {
    const result = await returnLeaseTransaction(
      params.id,
      await request.json().catch(() => ({})),
      auth.session.user,
    );
    return jsonOk(result, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not close the lease.",
      400,
    );
  }
}
