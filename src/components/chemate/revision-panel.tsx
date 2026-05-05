"use client";

import { useState, useTransition } from "react";
import { BrainCircuit, RefreshCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type UploadOption = {
  id: string;
  title: string;
  topic: string;
};

type SummaryArtifact = {
  id: string;
  title: string;
  body: string;
  payload: {
    flashcards?: {
      id: string;
      question: string;
      answer: string;
      formula: string | null;
    }[];
  } | null;
  createdAt: string;
};

export function RevisionPanel({
  uploads,
  summaries,
  streak,
  totalMinutes,
}: {
  uploads: UploadOption[];
  summaries: SummaryArtifact[];
  streak: number;
  totalMinutes: number;
}) {
  const router = useRouter();
  const [selectedUploadId, setSelectedUploadId] = useState(uploads[0]?.id ?? "");
  const [activeSummary, setActiveSummary] = useState<SummaryArtifact | null>(summaries[0] ?? null);
  const [isPending, startTransition] = useTransition();

  function generateSummary() {
    if (!selectedUploadId) {
      toast.error("Pick a note or question set to summarise.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/uploads/${selectedUploadId}/summary`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to build a summary.");
        return;
      }

      setActiveSummary({
        id: payload.artifact.id,
        title: payload.artifact.title,
        body: payload.artifact.body,
        payload: payload.artifact.payload,
        createdAt: payload.artifact.createdAt,
      });
      toast.success("Summary and flashcards generated.");
      router.refresh();
    });
  }

  const flashcards = activeSummary?.payload?.flashcards ?? [];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Study streak", value: `${streak} days` },
          { label: "Tracked minutes", value: `${totalMinutes} min` },
          { label: "Saved summaries", value: `${summaries.length}` },
        ].map((item) => (
          <div key={item.label} className="panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-soft">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-ink">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="panel p-6 md:p-8">
        <span className="eyebrow">Revision mode</span>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Summaries, flashcards, and weak-topic reinforcement</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-ink-soft">
          Turn any uploaded note or question bank into quick revision material. Chemate keeps the flashcards tied to your own material so recall practice stays relevant.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <select
            className="select max-w-xl"
            value={selectedUploadId}
            onChange={(event) => setSelectedUploadId(event.target.value)}
          >
            <option value="">Select material</option>
            {uploads.map((upload) => (
              <option key={upload.id} value={upload.id}>
                {upload.title} · {upload.topic}
              </option>
            ))}
          </select>
          <button type="button" className="button-primary" disabled={isPending} onClick={generateSummary}>
            <Sparkles className="h-4 w-4" />
            Generate revision pack
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrainCircuit className="h-5 w-5 text-cyan-300" />
              <h2 className="text-2xl font-semibold text-ink">Latest summary</h2>
            </div>
            {activeSummary ? (
              <button
                type="button"
                className="button-secondary"
                onClick={() => setActiveSummary(activeSummary)}
              >
                <RefreshCcw className="h-4 w-4 text-cyan-300" />
                Active
              </button>
            ) : null}
          </div>

          {activeSummary ? (
            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-lg font-semibold text-ink">{activeSummary.title}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-ink-soft">
                {activeSummary.body}
              </p>
            </div>
          ) : (
            <p className="mt-5 text-sm leading-7 text-ink-soft">
              Generate a revision pack to see the summary here.
            </p>
          )}

          <div className="mt-6 space-y-3">
            {summaries.slice(0, 4).map((summary) => (
              <button
                key={summary.id}
                type="button"
                className="w-full rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/8"
                onClick={() => setActiveSummary(summary)}
              >
                <p className="font-semibold text-ink">{summary.title}</p>
                <p className="mt-2 text-sm leading-7 text-ink-soft">
                  {summary.body.slice(0, 160)}...
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="text-2xl font-semibold text-ink">Flashcards</h2>
          <div className="mt-5 space-y-4">
            {flashcards.length ? (
              flashcards.map((card) => (
                <article
                  key={card.id}
                  className="rounded-[24px] border border-cyan-300/14 bg-cyan-300/6 p-5"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
                    Prompt
                  </p>
                  <p className="mt-2 text-base font-semibold text-ink">{card.question}</p>
                  <p className="mt-4 text-sm leading-7 text-ink-soft">{card.answer}</p>
                  {card.formula ? (
                    <p className="mt-4 font-mono text-xs text-lime-100">{card.formula}</p>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-ink-soft">
                Generate a revision pack to populate flashcards from your uploaded chemistry material.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
