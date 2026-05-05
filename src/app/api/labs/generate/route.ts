import { z } from "zod";
import { authorizeApiRequest } from "@/lib/auth/session";
import { generateLabReport } from "@/lib/chemate/lab-report";
import { jsonError, jsonOk } from "@/lib/http";

const schema = z.object({
  manualUploadId: z.string().trim().min(1),
  title: z.string().trim().max(200).optional(),
  observedData: z.string().trim().max(4000).optional(),
});

export async function POST(request: Request) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonError("Invalid lab report request.", 400, parsed.error.issues);
  }

  const report = await generateLabReport({
    userId: auth.session.user.id,
    manualUploadId: parsed.data.manualUploadId,
    title: parsed.data.title,
    observedData: parsed.data.observedData,
  });

  if (!report) {
    return jsonError("Lab manual not found.", 404);
  }

  return jsonOk(report);
}
