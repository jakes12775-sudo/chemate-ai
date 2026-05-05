import { authorizeApiRequest } from "@/lib/auth/session";
import { deleteUpload, getUploadDetail } from "@/lib/chemate/service";
import { jsonError, jsonOk } from "@/lib/http";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const upload = await getUploadDetail(auth.session.user.id, id);

  if (!upload) {
    return jsonError("Upload not found.", 404);
  }

  return jsonOk({
    upload,
  });
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const deleted = await deleteUpload(auth.session.user.id, id);

  if (!deleted) {
    return jsonError("Upload not found.", 404);
  }

  return jsonOk({
    ok: true,
  });
}
