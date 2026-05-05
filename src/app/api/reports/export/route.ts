import { authorizeApiRequest } from "@/lib/auth/session";
import { exportTransactionsCsv } from "@/lib/pos/queries";

export async function GET() {
  const auth = await authorizeApiRequest(["super_admin"]);

  if ("response" in auth) {
    return auth.response;
  }

  const csv = await exportTransactionsCsv();

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ezzclean-transactions.csv"',
    },
  });
}
