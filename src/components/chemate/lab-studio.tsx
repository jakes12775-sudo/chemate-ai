"use client";

import { useState, useTransition } from "react";
import { Download, FilePlus2, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Manual = {
  id: string;
  title: string;
  topic: string;
  summary: string | null;
};

export function LabStudio({ manuals }: { manuals: Manual[] }) {
  const router = useRouter();
  const [selectedManualId, setSelectedManualId] = useState(manuals[0]?.id ?? "");
  const [manualTitle, setManualTitle] = useState("");
  const [observedData, setObservedData] = useState("");
  const [quickUpload, setQuickUpload] = useState({
    title: "",
    topic: "",
    content: "",
  });
  const [report, setReport] = useState<{
    artifactId: string;
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
    citations: { id: string; pageNumber: number | null; sectionTitle: string | null; snippet: string }[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function createQuickManual() {
    if (!quickUpload.title.trim() || !quickUpload.topic.trim() || !quickUpload.content.trim()) {
      toast.error("Add a title, topic, and manual content before uploading.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/uploads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          drafts: [
            {
              ...quickUpload,
              kind: "lab_manual",
              description: "Quick lab manual upload from the labs page",
            },
          ],
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to upload the manual.");
        return;
      }

      toast.success("Lab manual uploaded.");
      setQuickUpload({ title: "", topic: "", content: "" });
      router.refresh();
    });
  }

  function generateReport() {
    if (!selectedManualId) {
      toast.error("Select a lab manual first.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/labs/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manualUploadId: selectedManualId,
          title: manualTitle,
          observedData,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to generate the lab report.");
        return;
      }

      setReport(payload);
      toast.success("Lab report generated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="panel p-6">
          <span className="eyebrow">Lab Manual Upload</span>
          <h1 className="mt-3 text-3xl font-semibold text-ink">Practical workflow and report builder</h1>
          <p className="mt-3 text-sm leading-8 text-ink-soft">
            Upload manuals, add your observations, and generate a detailed academic report with PDF export.
          </p>

          <div className="mt-6 space-y-4">
            <input
              className="field"
              placeholder="Manual title"
              value={quickUpload.title}
              onChange={(event) => setQuickUpload((current) => ({ ...current, title: event.target.value }))}
            />
            <input
              className="field"
              placeholder="Topic"
              value={quickUpload.topic}
              onChange={(event) => setQuickUpload((current) => ({ ...current, topic: event.target.value }))}
            />
            <textarea
              className="textarea"
              placeholder="Paste the lab manual content here for searchable report generation."
              value={quickUpload.content}
              onChange={(event) => setQuickUpload((current) => ({ ...current, content: event.target.value }))}
            />
            <button
              type="button"
              className="button-secondary"
              disabled={isPending}
              onClick={createQuickManual}
            >
              <FilePlus2 className="h-4 w-4 text-cyan-300" />
              Upload quick lab manual
            </button>
          </div>
        </div>

        <div className="panel p-6">
          <span className="eyebrow">Generate report</span>
          <div className="mt-4 grid gap-4">
            <select
              className="select"
              value={selectedManualId}
              onChange={(event) => setSelectedManualId(event.target.value)}
            >
              <option value="">Select uploaded lab manual</option>
              {manuals.map((manual) => (
                <option key={manual.id} value={manual.id}>
                  {manual.title}
                </option>
              ))}
            </select>

            <input
              className="field"
              placeholder="Report title (optional)"
              value={manualTitle}
              onChange={(event) => setManualTitle(event.target.value)}
            />

            <textarea
              className="textarea"
              placeholder="Observed data / measured values. Add raw readings or trial values for better generated results."
              value={observedData}
              onChange={(event) => setObservedData(event.target.value)}
            />

            <button
              type="button"
              className="button-primary"
              disabled={isPending}
              onClick={generateReport}
            >
              <FlaskConical className="h-4 w-4" />
              Generate detailed report
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {manuals.map((manual) => (
              <div key={manual.id} className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-ink">{manual.title}</p>
                <p className="mt-2 text-sm leading-7 text-ink-soft">{manual.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="eyebrow">Report preview</span>
            <h2 className="mt-3 text-2xl font-semibold text-ink">Detailed laboratory output</h2>
          </div>
          {report ? (
            <a className="button-secondary" href={`/api/labs/${report.artifactId}/pdf`}>
              <Download className="h-4 w-4 text-cyan-300" />
              Download PDF
            </a>
          ) : null}
        </div>

        {report ? (
          <div className="mt-6 space-y-5">
            <article className="rounded-[26px] border border-white/10 bg-white/5 p-5">
              <h3 className="text-3xl font-semibold text-ink">{report.title}</h3>
              <div className="mt-5 space-y-4 text-sm leading-8 text-ink-soft">
                <section>
                  <p className="font-semibold text-ink">Objective</p>
                  <p>{report.objective}</p>
                </section>
                <section>
                  <p className="font-semibold text-ink">Introduction</p>
                  <p>{report.introduction}</p>
                </section>
                <section>
                  <p className="font-semibold text-ink">Apparatus and reagents</p>
                  <p>{report.apparatusAndReagents}</p>
                </section>
                <section>
                  <p className="font-semibold text-ink">Procedure (prose)</p>
                  <p>{report.procedure}</p>
                </section>
                <section>
                  <p className="font-semibold text-ink">Results</p>
                  <p className="whitespace-pre-wrap">{report.results}</p>
                </section>
                <section>
                  <p className="font-semibold text-ink">Observations</p>
                  <p>{report.observations}</p>
                </section>
                <section>
                  <p className="font-semibold text-ink">Discussion / calculations</p>
                  <p className="whitespace-pre-wrap">{report.calculations}</p>
                  <p className="mt-3">{report.discussion}</p>
                </section>
                <section>
                  <p className="font-semibold text-ink">Conclusions</p>
                  <p>{report.conclusion}</p>
                </section>
                <section>
                  <p className="font-semibold text-ink">References (AI sourced)</p>
                  <ul className="space-y-2">
                    {report.references.map((reference) => (
                      <li key={reference}>- {reference}</li>
                    ))}
                  </ul>
                </section>
              </div>
            </article>

            <div className="callout">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
                Manual evidence used
              </p>
              <div className="mt-3 space-y-3 text-sm leading-7 text-ink-soft">
                {report.citations.map((citation) => (
                  <div key={citation.id}>
                    <p className="font-semibold text-ink">
                      Page {citation.pageNumber ?? "?"}
                      {citation.sectionTitle ? ` · ${citation.sectionTitle}` : ""}
                    </p>
                    <p>{citation.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[26px] border border-white/10 bg-white/5 p-6 text-sm leading-8 text-ink-soft">
            Select a lab manual and generate a report to preview the required sections here, then export the PDF for submission or printing.
          </div>
        )}
      </section>
    </div>
  );
}
