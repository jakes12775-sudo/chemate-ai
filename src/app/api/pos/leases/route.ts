import { authorizeApiRequest } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { createLeaseTransaction } from "@/lib/pos/service";

export async function POST(request: Request) {
  const auth = await authorizeApiRequest(["cashier", "super_admin"]);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const result = await createLeaseTransaction(
      await request.json(),
      auth.session.user,
    );
    return jsonOk(result, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not register the lease.",
      400,
    );
  }
}
