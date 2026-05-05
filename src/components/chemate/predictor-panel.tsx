"use client";

import { useState, useTransition } from "react";
import { Activity, Radar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type PredictionArtifact = {
  id: string;
  title: string;
  body: string;
  payload: {
    readinessScore?: number;
    rankedTopics?: { topic: string; confidence: number; reason: string }[];
    likelyQuestions?: { id: string; question: string; confidence: number }[];
  } | null;
  createdAt: string;
};

export function PredictorPanel({
  initialPrediction,
  uploadCount,
  questionCount,
}: {
  initialPrediction: PredictionArtifact | null;
  uploadCount: number;
  questionCount: number;
}) {
  const router = useRouter();
  const [prediction, setPrediction] = useState<PredictionArtifact | null>(initialPrediction);
  const [isPending, startTransition] = useTransition();

  function runPrediction() {
    startTransition(async () => {
      const response = await fetch("/api/predictor", {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to generate predictions.");
        return;
      }

      setPrediction({
        id: payload.artifact.id,
        title: payload.artifact.title,
        body: payload.artifact.body,
        payload: payload.artifact.payload,
        createdAt: payload.artifact.createdAt,
      });
      toast.success("Exam prediction refreshed.");
      router.refresh();
    });
  }

  const rankedTopics = prediction?.payload?.rankedTopics ?? [];
  const likelyQuestions = prediction?.payload?.likelyQuestions ?? [];

  return (
    <div className="space-y-6">
      <section className="panel p-6 md:p-8">
        <span className="eyebrow">Exam predictor</span>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Predict what your exam is most likely to target</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-ink-soft">
          Chemate uses uploaded notes, question banks, and answered prompts to estimate the topics and question styles most likely to appear next.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Total uploads
            </p>
            <p className="mt-3 text-3xl font-semibold text-ink">{uploadCount}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Question-driven signals
            </p>
            <p className="mt-3 text-3xl font-semibold text-ink">{questionCount}</p>
          </div>
          <div className="rounded-[24px] border border-lime-300/14 bg-lime-300/6 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-lime-100">
              Readiness score
            </p>
            <p className="mt-3 text-3xl font-semibold text-ink">
              {prediction?.payload?.readinessScore ?? 0}%
            </p>
          </div>
        </div>

        <button type="button" className="button-primary mt-6" disabled={isPending} onClick={runPrediction}>
          <Sparkles className="h-4 w-4" />
          Run fresh prediction
        </button>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="panel p-6">
          <div className="flex items-center gap-3">
            <Radar className="h-5 w-5 text-cyan-300" />
            <h2 className="text-2xl font-semibold text-ink">High-probability topics</h2>
          </div>
          <div className="mt-5 space-y-4">
            {rankedTopics.map((topic) => (
              <article
                key={topic.topic}
                className="rounded-[24px] border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-lg font-semibold text-ink">{topic.topic}</p>
                  <span className="badge bg-cyan-300/10 text-cyan-200">
                    {Math.round(topic.confidence * 100)}%
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-ink-soft">{topic.reason}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-lime-300" />
            <h2 className="text-2xl font-semibold text-ink">Likely question styles</h2>
          </div>
          <div className="mt-5 space-y-4">
            {likelyQuestions.map((question) => (
              <article
                key={question.id}
                className="rounded-[24px] border border-lime-300/14 bg-lime-300/6 p-5"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-lime-100">
                  {Math.round(question.confidence * 100)}% probability
                </p>
                <p className="mt-3 text-base leading-8 text-ink">{question.question}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {prediction ? (
        <section className="panel p-6">
          <span className="eyebrow">Narrative</span>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-8 text-ink-soft">
            {prediction.body}
          </div>
        </section>
      ) : null}
    </div>
  );
}
