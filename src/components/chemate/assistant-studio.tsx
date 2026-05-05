"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AiProvider } from "@prisma/client";
import {
  Calculator,
  Eraser,
  History,
  Orbit,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

type RecentAnswer = {
  id: string;
  prompt: string;
  title: string;
  body: string;
  createdAt: string;
  knowledgeMode: string;
  answerBlocks: { label: string; content: string }[];
  citations: {
    id: string;
    pageNumber: number | null;
    sectionTitle: string | null;
    snippet: string;
  }[];
};

type AnswerPayload = {
  artifactId: string | null;
  question: string;
  mode: string;
  answerBlocks: { label: string; content: string }[];
  citations: { id: string; pageNumber: number | null; sectionTitle: string | null; snippet: string }[];
  confidence: number;
  needsExternalPermission: boolean;
  directEvidence: { title: string; topic: string; snippet: string; pageNumber?: number }[];
};

type CalculationResponse = {
  title: string;
  formulaUsed: string;
  substitutions: string;
  steps: string[];
  finalAnswer: number;
  units: string;
  sigFigs: number;
  extra?: Record<string, number | string>;
};

export function AssistantStudio({
  recentAnswers,
}: {
  recentAnswers: RecentAnswer[];
}) {
  const router = useRouter();
  const [history, setHistory] = useState(recentAnswers);
  const [question, setQuestion] = useState("");
  const [allowExternal, setAllowExternal] = useState(false);
  const [provider, setProvider] = useState<AiProvider>("mock");
  const [answer, setAnswer] = useState<AnswerPayload | null>(null);
  const [calcMode, setCalcMode] = useState<
    "stoichiometry" | "kinetics" | "electrochemistry" | "thermodynamics" | "gas_law"
  >("stoichiometry");
  const [stoich, setStoich] = useState({
    knownMoles: "2",
    knownCoefficient: "1",
    targetCoefficient: "2",
    targetName: "H2O",
  });
  const [kinetics, setKinetics] = useState({
    initialConcentration: "0.80",
    rateConstant: "0.12",
    time: "8",
  });
  const [electro, setElectro] = useState({
    cathodePotential: "0.80",
    anodePotential: "0.34",
    electrons: "2",
  });
  const [thermo, setThermo] = useState({
    mass: "100",
    specificHeatCapacity: "4.18",
    deltaTemperature: "6.3",
  });
  const [gasLaw, setGasLaw] = useState({
    volume: "10",
    moles: "0.50",
    temperature: "298",
  });
  const [calculation, setCalculation] = useState<CalculationResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const readiness = useMemo(
    () => (answer ? `${Math.round(answer.confidence * 100)}% confidence` : "Waiting for a question"),
    [answer],
  );

  function submitQuestion() {
    if (!question.trim()) {
      toast.error("Enter a chemistry question first.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/assistant/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          allowExternal,
          preferredProvider: provider,
        }),
      });

      const payload = (await response.json()) as AnswerPayload & { error?: string };

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to answer that question.");
        return;
      }

      setAnswer(payload);

      if (payload.artifactId) {
        const artifactId = payload.artifactId;
        setHistory((current) => [
          {
            id: artifactId,
            prompt: payload.question,
            title: `${payload.mode === "external" ? "External" : "Grounded"} answer`,
            body: payload.answerBlocks.map((block) => `${block.label}: ${block.content}`).join("\n\n"),
            createdAt: new Date().toISOString(),
            knowledgeMode: payload.mode,
            answerBlocks: payload.answerBlocks,
            citations: payload.citations,
          },
          ...current.filter((item) => item.id !== artifactId),
        ]);
      }

      if (payload.needsExternalPermission) {
        toast.message("The notes do not cover this strongly enough yet. Turn on external AI and submit again if you want a provider-backed answer.");
      } else {
        toast.success("Answer generated.");
      }

      router.refresh();
    });
  }

  function runCalculation() {
    startTransition(async () => {
      const requestBody =
        calcMode === "stoichiometry"
          ? {
              mode: "stoichiometry",
              input: {
                knownMoles: Number(stoich.knownMoles),
                knownCoefficient: Number(stoich.knownCoefficient),
                targetCoefficient: Number(stoich.targetCoefficient),
                targetName: stoich.targetName,
              },
            }
          : calcMode === "kinetics"
            ? {
                mode: "kinetics",
                input: {
                  initialConcentration: Number(kinetics.initialConcentration),
                  rateConstant: Number(kinetics.rateConstant),
                  time: Number(kinetics.time),
                },
              }
            : calcMode === "electrochemistry"
              ? {
                  mode: "electrochemistry",
                  input: {
                    cathodePotential: Number(electro.cathodePotential),
                    anodePotential: Number(electro.anodePotential),
                    electrons: Number(electro.electrons),
                  },
                }
              : calcMode === "thermodynamics"
                ? {
                    mode: "thermodynamics",
                    input: {
                      mass: Number(thermo.mass),
                      specificHeatCapacity: Number(thermo.specificHeatCapacity),
                      deltaTemperature: Number(thermo.deltaTemperature),
                    },
                  }
                : {
                    mode: "gas_law",
                    input: {
                      volume: Number(gasLaw.volume),
                      moles: Number(gasLaw.moles),
                      temperature: Number(gasLaw.temperature),
                    },
                  };

      const response = await fetch("/api/calculations/solve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = (await response.json()) as CalculationResponse & { error?: string };

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to solve that calculation.");
        return;
      }

      setCalculation(payload);
      toast.success("Calculation solved.");
      router.refresh();
    });
  }

  function openHistoryItem(item: RecentAnswer) {
    setQuestion(item.prompt);
    setAnswer({
      artifactId: item.id,
      question: item.prompt,
      mode: item.knowledgeMode,
      answerBlocks:
        item.answerBlocks.length
          ? item.answerBlocks
          : [
              {
                label: item.knowledgeMode === "external" ? "External Source - AI Knowledge" : "Saved Answer",
                content: item.body,
              },
            ],
      citations: item.citations,
      confidence: 0.75,
      needsExternalPermission: false,
      directEvidence: [],
    });
    toast.success("Saved answer loaded.");
  }

  function clearHistory() {
    startTransition(async () => {
      const response = await fetch("/api/assistant/history", {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to clear history.");
        return;
      }

      setHistory([]);
      setAnswer(null);
      toast.success("Question history cleared.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6 md:p-8">
        <span className="eyebrow">Grounded Q&A</span>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Ask from notes first</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-ink-soft">
          Chemate answers from uploaded notes, questions, and manuals first. If the notes miss the answer, external AI can take over with exam-ready structure.
        </p>

        <textarea
          className="textarea mt-6"
          placeholder="Example: Write the cell notation for the Daniell cell and calculate Ecell from cathode 0.34 V and anode -0.76 V."
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={allowExternal}
              onChange={(event) => setAllowExternal(event.target.checked)}
            />
            Use external AI if the notes miss it
          </label>

          <select
            className="select max-w-[220px]"
            value={provider}
            onChange={(event) => setProvider(event.target.value as AiProvider)}
          >
            <option value="mock">Mock / local mode</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>

          <button type="button" className="button-primary" disabled={isPending} onClick={submitQuestion}>
            <Sparkles className="h-4 w-4" />
            Answer question
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setQuestion("");
              setAnswer(null);
            }}
          >
            <Eraser className="h-4 w-4 text-cyan-300" />
            Clear current
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="eyebrow">Answer</span>
              <h2 className="mt-3 text-2xl font-semibold text-ink">Exam-ready response</h2>
            </div>
            <span className="badge bg-cyan-300/10 text-cyan-200">{readiness}</span>
          </div>

          {answer ? (
            <div className="mt-6 space-y-4">
              {answer.needsExternalPermission ? (
                <div className="rounded-[24px] border border-yellow-300/20 bg-yellow-300/8 p-4 text-sm leading-7 text-yellow-100">
                  <div className="flex items-center gap-2 font-semibold">
                    <TriangleAlert className="h-4 w-4" />
                    External permission needed
                  </div>
                  <p className="mt-2">
                    The notes do not cover this strongly enough yet. Turn on external AI and submit again if you want a provider-backed answer.
                  </p>
                </div>
              ) : null}

              {answer.answerBlocks.map((block) => (
                <article
                  key={block.label}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    {block.label}
                  </p>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-8 text-ink-soft">
                    {block.content}
                  </div>
                </article>
              ))}

              {answer.directEvidence.length ? (
                <div className="rounded-[24px] border border-cyan-300/14 bg-cyan-300/6 p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
                    Note evidence
                  </p>
                  <div className="mt-3 space-y-3 text-sm text-ink-soft">
                    {answer.directEvidence.map((item) => (
                      <div key={`${item.title}-${item.pageNumber ?? "na"}`}>
                        <p className="font-semibold text-ink">
                          {item.title}
                          {item.pageNumber ? ` · Page ${item.pageNumber}` : ""}
                        </p>
                        <p className="mt-1 leading-7">{item.snippet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {answer.citations.length ? (
                <div className="rounded-[24px] border border-lime-300/14 bg-lime-300/6 p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-lime-100">
                    Citations
                  </p>
                  <div className="mt-3 space-y-3 text-sm text-ink-soft">
                    {answer.citations.map((citation) => (
                      <div key={citation.id}>
                        <p className="font-semibold text-ink">
                          Page {citation.pageNumber ?? "?"}
                          {citation.sectionTitle ? ` · ${citation.sectionTitle}` : ""}
                        </p>
                        <p className="mt-1 leading-7">{citation.snippet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-6 text-sm leading-7 text-ink-soft">
              Ask a question to see grounded theory, equations, structures, working, and citations from your uploaded materials.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <div className="flex items-center gap-3">
              <Calculator className="h-5 w-5 text-lime-300" />
              <h2 className="text-2xl font-semibold text-ink">Calculation engine</h2>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {(
                ["stoichiometry", "kinetics", "electrochemistry", "thermodynamics", "gas_law"] as const
              ).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    calcMode === mode ? "bg-cyan-300/14 text-ink" : "bg-white/5 text-ink-soft"
                  }`}
                  onClick={() => setCalcMode(mode)}
                >
                  {mode.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              {calcMode === "stoichiometry" ? (
                <>
                  <input className="field" value={stoich.knownMoles} onChange={(event) => setStoich({ ...stoich, knownMoles: event.target.value })} placeholder="Known moles" />
                  <input className="field" value={stoich.knownCoefficient} onChange={(event) => setStoich({ ...stoich, knownCoefficient: event.target.value })} placeholder="Known coefficient" />
                  <input className="field" value={stoich.targetCoefficient} onChange={(event) => setStoich({ ...stoich, targetCoefficient: event.target.value })} placeholder="Target coefficient" />
                  <input className="field" value={stoich.targetName} onChange={(event) => setStoich({ ...stoich, targetName: event.target.value })} placeholder="Target chemical name" />
                </>
              ) : null}

              {calcMode === "kinetics" ? (
                <>
                  <input className="field" value={kinetics.initialConcentration} onChange={(event) => setKinetics({ ...kinetics, initialConcentration: event.target.value })} placeholder="Initial concentration" />
                  <input className="field" value={kinetics.rateConstant} onChange={(event) => setKinetics({ ...kinetics, rateConstant: event.target.value })} placeholder="Rate constant k" />
                  <input className="field" value={kinetics.time} onChange={(event) => setKinetics({ ...kinetics, time: event.target.value })} placeholder="Time" />
                </>
              ) : null}

              {calcMode === "electrochemistry" ? (
                <>
                  <input className="field" value={electro.cathodePotential} onChange={(event) => setElectro({ ...electro, cathodePotential: event.target.value })} placeholder="Cathode potential" />
                  <input className="field" value={electro.anodePotential} onChange={(event) => setElectro({ ...electro, anodePotential: event.target.value })} placeholder="Anode potential" />
                  <input className="field" value={electro.electrons} onChange={(event) => setElectro({ ...electro, electrons: event.target.value })} placeholder="Number of electrons" />
                </>
              ) : null}

              {calcMode === "thermodynamics" ? (
                <>
                  <input className="field" value={thermo.mass} onChange={(event) => setThermo({ ...thermo, mass: event.target.value })} placeholder="Mass / g" />
                  <input className="field" value={thermo.specificHeatCapacity} onChange={(event) => setThermo({ ...thermo, specificHeatCapacity: event.target.value })} placeholder="Specific heat capacity / J g^-1 C^-1" />
                  <input className="field" value={thermo.deltaTemperature} onChange={(event) => setThermo({ ...thermo, deltaTemperature: event.target.value })} placeholder="Temperature change / C" />
                </>
              ) : null}

              {calcMode === "gas_law" ? (
                <>
                  <input className="field" value={gasLaw.volume} onChange={(event) => setGasLaw({ ...gasLaw, volume: event.target.value })} placeholder="Volume / dm^3" />
                  <input className="field" value={gasLaw.moles} onChange={(event) => setGasLaw({ ...gasLaw, moles: event.target.value })} placeholder="Moles / mol" />
                  <input className="field" value={gasLaw.temperature} onChange={(event) => setGasLaw({ ...gasLaw, temperature: event.target.value })} placeholder="Temperature / K" />
                </>
              ) : null}
            </div>

            <button type="button" className="button-primary mt-5" disabled={isPending} onClick={runCalculation}>
              Solve calculation
            </button>

            {calculation ? (
              <div className="callout mt-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
                  {calculation.title}
                </p>
                <p className="mt-2 font-mono text-sm text-ink">{calculation.formulaUsed}</p>
                <p className="mt-2 text-sm text-ink-soft">Substitution: {calculation.substitutions}</p>
                <div className="mt-4 space-y-2 text-sm leading-7 text-ink-soft">
                  {calculation.steps.map((step) => (
                    <p key={step}>{step}</p>
                  ))}
                </div>
                <p className="mt-4 text-lg font-semibold text-ink">
                  Final answer: {calculation.finalAnswer} {calculation.units}
                </p>
              </div>
            ) : null}
          </div>

          <div className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-cyan-300" />
                <h2 className="text-2xl font-semibold text-ink">Question history</h2>
              </div>
              <button type="button" className="button-secondary" disabled={isPending || !history.length} onClick={clearHistory}>
                <Eraser className="h-4 w-4 text-cyan-300" />
                Clear
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {history.length ? (
                history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full rounded-[22px] border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/8"
                    onClick={() => openHistoryItem(item)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-ink">{item.prompt}</p>
                      <span className="badge bg-white/6 text-ink-soft">{item.knowledgeMode}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-ink-soft">
                      {item.body.slice(0, 180)}...
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-sm leading-7 text-ink-soft">
                  Your saved question history will appear here for quick reopening.
                </p>
              )}
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex items-center gap-3">
              <Orbit className="h-5 w-5 text-cyan-300" />
              <h2 className="text-2xl font-semibold text-ink">Smart answer rules</h2>
            </div>
            <div className="mt-4 space-y-2 text-sm leading-7 text-ink-soft">
              <p>Chemate now separates theory, equation, structure, and calculation questions.</p>
              <p>Note matches stay note-grounded first. External AI only answers when you allow it.</p>
              <p>Calculation answers follow formula, substitution, working, and final answer order.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
