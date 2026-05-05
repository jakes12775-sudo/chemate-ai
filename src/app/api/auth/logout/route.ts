import { clearUserSession } from "@/lib/auth/session";
import { jsonOk } from "@/lib/http";

export async function POST() {
  await clearUserSession();

  return jsonOk({
    ok: true,
  });
}
