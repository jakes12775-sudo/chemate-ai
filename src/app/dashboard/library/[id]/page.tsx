import Link from "next/link";
import { ArrowLeft, FileText, FlaskConical, Sigma } from "lucide-react";
import { requirePageSession } from "@/lib/auth/session";
import { getUploadDetail } from "@/lib/chemate/service";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function LibraryDetailPage({ params }: Params) {
  const session = await requirePageSession(["student", "mentor", "super_admin", "cashier"]);
  const { id } = await params;
  const upload = await getUploadDetail(session.user.id, id);

  if (!upload) {
    return (
      <div className="panel p-8">
        <p className="text-lg font-semibold text-ink">That upload could not be found.</p>
        <Link href="/dashboard/library" className="button-secondary mt-4">
          <ArrowLeft className="h-4 w-4 text-cyan-300" />
          Back to library
        </Link>
      </div>
    );
  }

  const formulas = Array.isArray(upload.formulas)
    ? upload.formulas.filter((item): item is string => typeof item === "string")
    : [];
  const structures = Array.isArray(upload.structures)
    ? upload.structures.filter((item): item is string => typeof item === "string")
    : [];

  return (
    <div className="space-y-6">
      <section className="panel p-6 md:p-8">
        <Link href="/dashboard/library" className="button-secondary">
          <ArrowLeft className="h-4 w-4 text-cyan-300" />
          Back to library
        </Link>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="badge bg-cyan-300/10 text-cyan-200">{upload.kind.replace("_", " ")}</span>
          <span className="badge bg-lime-300/10 text-lime-200">{upload.topic}</span>
        </div>

        <h1 className="mt-4 text-3xl font-semibold text-ink">{upload.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-ink-soft">
          {upload.summary ?? "Open the sections below to read through the uploaded material directly from your dashboard."}
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="panel p-6">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-cyan-300" />
            <h2 className="text-2xl font-semibold text-ink">Readable note pages</h2>
          </div>
          <div className="mt-6 space-y-5">
            {upload.pages.map((page) => (
              <article
                key={page.id}
                className="rounded-[28px] border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-lg font-semibold text-ink">
                    Page {page.pageNumber}
                  </p>
                  <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">
                    {page.sectionTitle}
                  </span>
                </div>
                <div className="mt-4 whitespace-pre-wrap text-sm leading-8 text-ink-soft">
                  {page.content}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <div className="flex items-center gap-3">
              <Sigma className="h-5 w-5 text-lime-300" />
              <h2 className="text-2xl font-semibold text-ink">Retrieved equations</h2>
            </div>
            <div className="mt-5 space-y-3">
              {formulas.length ? (
                formulas.map((formula) => (
                  <div
                    key={formula}
                    className="rounded-[22px] border border-lime-300/14 bg-lime-300/6 px-4 py-3 font-mono text-sm text-ink"
                  >
                    {formula}
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-ink-soft">
                  No formula lines were extracted automatically yet. You can still use the assistant to answer directly from the readable note sections.
                </p>
              )}
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-cyan-300" />
              <h2 className="text-2xl font-semibold text-ink">Structure cues and chemistry terms</h2>
            </div>
            <div className="mt-5 space-y-3">
              {structures.length ? (
                structures.map((structure) => (
                  <div
                    key={structure}
                    className="rounded-[22px] border border-cyan-300/14 bg-cyan-300/6 px-4 py-3 text-sm text-ink"
                  >
                    {structure}
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-ink-soft">
                  No direct structure cues were extracted from this upload. Add more detailed text or explicitly included chemical structure lines for stronger retrieval.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
