import { authorizeApiRequest } from "@/lib/auth/session";
import { buildReceiptPdf } from "@/lib/pos/pdf";
import { getReceiptDetail } from "@/lib/pos/queries";
import { jsonError } from "@/lib/http";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ receiptNumber: string }> | { receiptNumber: string };
  },
) {
  const auth = await authorizeApiRequest(["cashier", "super_admin"]);

  if ("response" in auth) {
    return auth.response;
  }

  const params =
    typeof (context.params as Promise<{ receiptNumber: string }>).then ===
    "function"
      ? await (context.params as Promise<{ receiptNumber: string }>)
      : (context.params as { receiptNumber: string });

  const detail = await getReceiptDetail(params.receiptNumber);

  if (!detail) {
    return jsonError("Receipt not found.", 404);
  }

  const bytes = await buildReceiptPdf(detail);
  const body = Uint8Array.from(bytes).buffer;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${params.receiptNumber}.pdf"`,
    },
  });
}
