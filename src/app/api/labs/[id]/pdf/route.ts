import { authorizeApiRequest } from "@/lib/auth/session";
import { buildLabReportPdf } from "@/lib/chemate/pdf";
import { getArtifactForUser } from "@/lib/chemate/service";
import { jsonError } from "@/lib/http";

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
  const artifact = await getArtifactForUser(auth.session.user.id, id);

  if (!artifact || artifact.type !== "lab_report" || !artifact.payload) {
    return jsonError("Lab report not found.", 404);
  }

  const payload = artifact.payload as {
    title: string;
    objective: string;
    introduction: string;
    apparatusAndReagents: string;
    procedure: string;
    results: string;
    observations: string;
    calculations: string;
    discussion: string;
    conclusion: string;
    references: string[];
  };

  const bytes = await buildLabReportPdf(payload);
  const body = Buffer.from(bytes);

  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${payload.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf"`,
    },
  });
}
