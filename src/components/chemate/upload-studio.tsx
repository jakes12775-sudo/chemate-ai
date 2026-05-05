"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadKind } from "@prisma/client";
import { FilePlus2, FileQuestion, FlaskConical, NotebookPen, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

type UploadSummary = {
  id: string;
  kind: UploadKind;
  title: string;
  topic: string;
  summary: string | null;
  tags: string[];
  createdAt: string | Date;
  fileName: string | null;
  pages: { id: string; pageNumber: number }[];
  formulas: unknown;
};

type Draft = {
  title: string;
  topic: string;
  kind: UploadKind;
  content: string;
  description: string;
  fileName?: string;
  mimeType?: string;
  tags: string;
};

const defaultDraft: Draft = {
  title: "",
  topic: "",
  kind: "note",
  content: "",
  description: "",
  tags: "",
};

function kindLabel(kind: UploadKind) {
  return kind.replace("_", " ");
}

async function readFileContent(file: File) {
  if (file.type.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(file.name)) {
    return file.text();
  }

  return `[Binary upload stored: ${file.name}. Paste extracted text here to make it searchable, summarizable, and answer-ready.]`;
}

export function UploadStudio({ initialUploads }: { initialUploads: UploadSummary[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([defaultDraft]);
  const [filter, setFilter] = useState<UploadKind | "all">("all");
  const [query, setQuery] = useState("");
  const [generatedSummaries, setGeneratedSummaries] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const uploads = useMemo(() => {
    return initialUploads.filter((upload) => {
      if (filter !== "all" && upload.kind !== filter) {
        return false;
      }

      if (!query.trim()) {
        return true;
      }

      const haystack = [upload.title, upload.topic, upload.summary ?? "", upload.tags.join(" ")]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [filter, initialUploads, query]);

  function updateDraft(index: number, patch: Partial<Draft>) {
    setDrafts((current) =>
      current.map((draft, currentIndex) =>
        currentIndex === index ? { ...draft, ...patch } : draft,
      ),
    );
  }

  function addDraft(kind: UploadKind = "note") {
    setDrafts((current) => [...current, { ...defaultDraft, kind }]);
  }

  function removeDraft(index: number) {
    setDrafts((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  }

  async function handleFileBatch(files: FileList | null, kind: UploadKind) {
    if (!files?.length) {
      return;
    }

    const nextDrafts = await Promise.all(
      Array.from(files).map(async (file) => ({
        title: file.name.replace(/\.[^.]+$/, ""),
        topic: kind === "lab_manual" ? "Laboratory Work" : kind === "question" ? "Exam Practice" : "Industrial Chemistry",
        kind,
        content: await readFileContent(file),
        description: `Imported from ${file.name}`,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        tags: "",
      })),
    );

    setDrafts((current) => [...current, ...nextDrafts]);
    toast.success(`${nextDrafts.length} file draft${nextDrafts.length === 1 ? "" : "s"} added.`);
  }

  function submitDrafts() {
    const cleaned = drafts
      .map((draft) => ({
        ...draft,
        title: draft.title.trim(),
        topic: draft.topic.trim(),
        content: draft.content.trim(),
        description: draft.description.trim(),
        tags: draft.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }))
      .filter((draft) => draft.title && draft.topic && draft.content);

    if (!cleaned.length) {
      toast.error("Add at least one complete upload draft before submitting.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/uploads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ drafts: cleaned }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to upload study materials.");
        return;
      }

      toast.success("Study materials uploaded successfully.");
      setDrafts([defaultDraft]);
      router.refresh();
    });
  }

  function generateSummary(uploadId: string) {
    startTransition(async () => {
      const response = await fetch(`/api/uploads/${uploadId}/summary`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        artifact?: { body: string };
      };

      if (!response.ok || !payload.artifact) {
        toast.error(payload.error ?? "Unable to create summary.");
        return;
      }

      setGeneratedSummaries((current) => ({
        ...current,
        [uploadId]: payload.artifact?.body ?? "",
      }));
      toast.success("Summary created.");
      router.refresh();
    });
  }

  function removeUpload(uploadId: string) {
    startTransition(async () => {
      const response = await fetch(`/api/uploads/${uploadId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to delete upload.");
        return;
      }

      toast.success("Upload removed from your active library.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow">Multi Upload Studio</span>
            <h1 className="mt-3 text-3xl font-semibold text-ink">Notes, questions, assignments, and lab manuals</h1>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-ink-soft">
              Upload several materials at once, paste extracted text for searchable answers, and keep everything organised by topic.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="button-secondary cursor-pointer">
              <NotebookPen className="h-4 w-4 text-cyan-300" />
              Add note files
              <input
                className="hidden"
                type="file"
                multiple
                onChange={(event) => handleFileBatch(event.target.files, "note")}
              />
            </label>
            <label className="button-secondary cursor-pointer">
              <FileQuestion className="h-4 w-4 text-cyan-300" />
              Add questions
              <input
                className="hidden"
                type="file"
                multiple
                onChange={(event) => handleFileBatch(event.target.files, "question")}
              />
            </label>
            <label className="button-secondary cursor-pointer">
              <FlaskConical className="h-4 w-4 text-cyan-300" />
              Add lab manuals
              <input
                className="hidden"
                type="file"
                multiple
                onChange={(event) => handleFileBatch(event.target.files, "lab_manual")}
              />
            </label>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {drafts.map((draft, index) => (
            <div key={`${index}-${draft.fileName ?? "manual"}`} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-lg font-semibold text-ink">Upload draft {index + 1}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => removeDraft(index)}
                  >
                    <Trash2 className="h-4 w-4 text-rose-300" />
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input
                  className="field"
                  placeholder="Title"
                  value={draft.title}
                  onChange={(event) => updateDraft(index, { title: event.target.value })}
                />
                <input
                  className="field"
                  placeholder="Topic"
                  value={draft.topic}
                  onChange={(event) => updateDraft(index, { topic: event.target.value })}
                />
                <select
                  className="select"
                  value={draft.kind}
                  onChange={(event) =>
                    updateDraft(index, { kind: event.target.value as UploadKind })
                  }
                >
                  <option value="note">Note</option>
                  <option value="question">Question</option>
                  <option value="lab_manual">Lab manual</option>
                  <option value="assignment">Assignment</option>
                </select>
                <input
                  className="field"
                  placeholder="Comma-separated tags"
                  value={draft.tags}
                  onChange={(event) => updateDraft(index, { tags: event.target.value })}
                />
              </div>

              <input
                className="field mt-4"
                placeholder="Short description"
                value={draft.description}
                onChange={(event) => updateDraft(index, { description: event.target.value })}
              />

              <textarea
                className="textarea mt-4"
                placeholder="Paste the note text, question set, or lab manual content here. For PDFs or scanned files, add extracted text so Chemate can answer from it."
                value={draft.content}
                onChange={(event) => updateDraft(index, { content: event.target.value })}
              />

              {draft.fileName ? (
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-ink-soft">
                  Imported from file: {draft.fileName}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="button-secondary" onClick={() => addDraft("note")}>
            <FilePlus2 className="h-4 w-4 text-cyan-300" />
            Add another draft
          </button>
          <button type="button" className="button-primary" disabled={isPending} onClick={submitDrafts}>
            Upload all drafts
            <Sparkles className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="panel p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="eyebrow">Library</span>
            <h2 className="mt-3 text-2xl font-semibold text-ink">Read, summarise, and manage your uploads</h2>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              className="field pl-11"
              placeholder="Search by title, topic, or tags"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["all", "note", "question", "lab_manual", "assignment"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === item ? "bg-cyan-300/14 text-ink" : "bg-white/5 text-ink-soft"
              }`}
              onClick={() => setFilter(item)}
            >
              {item === "all" ? "All uploads" : kindLabel(item)}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {uploads.map((upload) => (
            <article key={upload.id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge bg-cyan-300/10 text-cyan-200">{kindLabel(upload.kind)}</span>
                    <span className="badge bg-lime-300/10 text-lime-200">{upload.topic}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-ink">{upload.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-ink-soft">
                    {upload.summary ?? "No summary generated yet."}
                  </p>
                </div>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => removeUpload(upload.id)}
                >
                  <Trash2 className="h-4 w-4 text-rose-300" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {upload.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white/6 px-3 py-1 text-xs text-ink-soft">
                    #{tag}
                  </span>
                ))}
              </div>

              {Array.isArray(upload.formulas) && upload.formulas.length ? (
                <div className="callout mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
                    Extracted equations / structures
                  </p>
                  <div className="mt-2 space-y-1 font-mono text-xs text-ink">
                    {upload.formulas.slice(0, 3).map((formula) => (
                      <p key={String(formula)}>{String(formula)}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {generatedSummaries[upload.id] ? (
                <div className="callout mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime-100">
                    Generated summary
                  </p>
                  <p className="mt-2 text-sm leading-7 text-ink">{generatedSummaries[upload.id]}</p>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/dashboard/library/${upload.id}`} className="button-secondary">
                  Read note
                </Link>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={isPending}
                  onClick={() => generateSummary(upload.id)}
                >
                  Make summary
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
