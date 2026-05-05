import { UploadKind } from "@prisma/client";
import { z } from "zod";
import { authorizeApiRequest } from "@/lib/auth/session";
import { createUploads, listUploadsForUser } from "@/lib/chemate/service";
import { jsonError, jsonOk } from "@/lib/http";

const uploadDraftSchema = z.object({
  title: z.string().trim().min(2).max(160),
  topic: z.string().trim().min(2).max(120),
  kind: z.nativeEnum(UploadKind),
  content: z.string().trim().min(8),
  description: z.string().trim().max(240).optional(),
  fileName: z.string().trim().max(240).optional(),
  mimeType: z.string().trim().max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});

const uploadRequestSchema = z.object({
  drafts: z.array(uploadDraftSchema).min(1).max(12),
});

export async function GET(request: Request) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const query = url.searchParams.get("q")?.trim();
  const uploads = await listUploadsForUser(
    auth.session.user.id,
    kind && kind !== "all" ? (kind as UploadKind) : "all",
    query,
  );

  return jsonOk({
    uploads,
  });
}

export async function POST(request: Request) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const parsed = uploadRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonError("Invalid upload payload.", 400, parsed.error.issues);
  }

  const uploads = await createUploads(auth.session.user.id, parsed.data.drafts);

  return jsonOk(
    {
      uploads,
    },
    { status: 201 },
  );
}
