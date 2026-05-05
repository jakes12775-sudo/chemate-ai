import { Prisma } from "@prisma/client";
import { generateExternalText } from "@/lib/chemate/ai";
import { createArtifactWithCitations, getUploadDetail } from "@/lib/chemate/service";

const DEFAULT_REFERENCES = [
  "Atkins, P., de Paula, J., and Keeler, J. Physical Chemistry.",
  "Vogel's Textbook of Quantitative Chemical Analysis.",
  "Skoog, D. A., West, D. M., Holler, F. J., and Crouch, S. R. Fundamentals of Analytical Chemistry.",
];

function cleanText(value: string) {
  return value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function extractManualSection(content: string, labels: string[]) {
  for (const label of labels) {
    const expression = new RegExp(`${label}\\s*:?\\s*([\\s\\S]*?)(?:\\n\\n[A-Z][A-Za-z ]{2,}:|$)`, "i");
    const match = content.match(expression);

    if (match?.[1]?.trim()) {
      return cleanText(match[1]);
    }
  }

  return "";
}

function toProcedureProse(rawProcedure: string, topic: string) {
  const lines = rawProcedure
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(\d+[\).]?|-|\*)\s*/, "").trim())
    .filter(Boolean);

  if (!lines.length) {
    return `The apparatus was assembled and the reagents for ${topic.toLowerCase()} were prepared according to the manual. Measurements were then taken carefully, the observations were recorded systematically, and the resulting data were processed in line with the stated experimental objective.`;
  }

  return `The experiment was carried out by following the manual sequence in prose form. ${lines
    .map((line, index) =>
      index === 0
        ? `First, ${line.charAt(0).toLowerCase()}${line.slice(1)}`
        : `Thereafter, ${line.charAt(0).toLowerCase()}${line.slice(1)}`,
    )
    .join(". ")}. Finally, the observations were recorded and the data were processed for interpretation.`;
}

function inferLabProfile(topic: string, content: string) {
  const lower = `${topic} ${content}`.toLowerCase();

  if (/(titration|acid-base|standardization|neutralization)/i.test(lower)) {
    return "titration";
  }

  if (/(kinetics|rate law|half-life|concentration with time)/i.test(lower)) {
    return "kinetics";
  }

  if (/(enthalpy|calorimetry|heat|thermodynamics|specific heat)/i.test(lower)) {
    return "thermodynamics";
  }

  if (/(electrochem|cell potential|electrode|voltaic|galvanic|conductivity)/i.test(lower)) {
    return "electrochemistry";
  }

  return "generic";
}

function buildGeneratedResults(profile: string, observedData?: string) {
  const observed = observedData?.trim();

  if (profile === "titration") {
    return {
      results:
        observed ||
        [
          "Trial | Initial burette / cm3 | Final burette / cm3 | Titre / cm3",
          "1 | 0.00 | 24.70 | 24.70",
          "2 | 0.00 | 24.80 | 24.80",
          "3 | 0.00 | 24.75 | 24.75",
          "Mean titre = 24.75 cm3",
        ].join("\n"),
      observations:
        "The indicator changed from colourless to a faint permanent pink at the end point, showing that neutralisation had just been achieved. Concordant titre values were obtained, indicating acceptable experimental precision.",
      calculations:
        "The concordant titres were averaged to give a mean titre of 24.75 cm3. The concentration calculation would then proceed with the relevant stoichiometric relation, commonly C1V1 / n1 = C2V2 / n2, using the standard solution concentration and the mean titre.",
    };
  }

  if (profile === "kinetics") {
    return {
      results:
        observed ||
        [
          "Time / s | Concentration / mol dm^-3 | ln[A]",
          "0 | 0.100 | -2.303",
          "60 | 0.088 | -2.431",
          "120 | 0.077 | -2.564",
          "180 | 0.068 | -2.686",
        ].join("\n"),
      observations:
        "The concentration decreased steadily with time. The transformed ln[A] values approached linearity with time, suggesting first-order behaviour across the measured interval.",
      calculations:
        "For a first-order interpretation, the slope of the ln[A] versus time plot corresponds to -k. Using the representative data trend, the rate constant would be obtained from the gradient, after which the half-life could be evaluated from t1/2 = 0.693 / k.",
    };
  }

  if (profile === "thermodynamics") {
    return {
      results:
        observed ||
        [
          "Mass of solution = 100.0 g",
          "Initial temperature = 25.1 C",
          "Final temperature = 31.4 C",
          "Temperature change, DeltaT = 6.3 C",
        ].join("\n"),
      observations:
        "A measurable increase in temperature was observed during the reaction, indicating an exothermic process under the recorded laboratory conditions.",
      calculations:
        "The heat change would be estimated from q = mcDeltaT. Using m = 100.0 g, c = 4.18 J g^-1 C^-1, and DeltaT = 6.3 C gives q approximately 2.63 x 10^3 J, before converting to enthalpy per mole where required.",
    };
  }

  if (profile === "electrochemistry") {
    return {
      results:
        observed ||
        [
          "Observed cell notation: Zn | Zn2+ || Cu2+ | Cu",
          "Measured cathode potential = +0.34 V",
          "Measured anode potential = -0.76 V",
          "Calculated Ecell = +1.10 V",
        ].join("\n"),
      observations:
        "A stable potential difference developed across the two half-cells. Metal deposition and electrode activity were consistent with spontaneous electron flow through the external circuit.",
      calculations:
        "The cell potential was obtained from Ecell = Ecathode - Eanode. With the representative values above, Ecell = 0.34 - (-0.76) = 1.10 V. If required, the free energy change would then follow from DeltaG = -nFEcell.",
    };
  }

  return {
    results:
      observed ||
      [
        "The recorded measurements were organised into a clear working set.",
        "The processed values showed a consistent trend that matched the intended experimental objective.",
      ].join("\n"),
    observations:
      "The experiment produced stable observations with an interpretable trend, showing that the method and measurement sequence were sufficiently consistent for academic discussion.",
    calculations:
      "The processed dataset was interpreted with the appropriate formula or graphical relationship expected for the experiment. Where necessary, averages, transformed variables, or derived constants would be calculated from the recorded values.",
  };
}

async function buildAiReferences(topic: string) {
  const generated = await generateExternalText({
    system:
      "You are Chemate AI. Provide exactly three concise academic chemistry references suitable for a university laboratory report. Return one reference per line and do not mention uploaded notes.",
    prompt: `Generate three references for a laboratory report on ${topic}.`,
  });

  const lines = generated.text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return lines.length >= 2 ? lines : DEFAULT_REFERENCES;
}

export async function generateLabReport(args: {
  userId: string;
  manualUploadId: string;
  title?: string;
  observedData?: string;
}) {
  const upload = await getUploadDetail(args.userId, args.manualUploadId);

  if (!upload) {
    return null;
  }

  const title =
    args.title?.trim() ||
    upload.title.replace(/^Practical Manual:\s*/i, "").trim() ||
    "Industrial Chemistry Laboratory Report";

  const objective =
    extractManualSection(upload.content, ["Aim", "Objective", "Objectives"]) ||
    `To investigate ${upload.topic.toLowerCase()} experimentally and interpret the outcome using correct chemical principles.`;
  const apparatusAndReagents =
    extractManualSection(upload.content, ["Apparatus and Reagents", "Apparatus", "Reagents"]) ||
    "Standard laboratory glassware, calibrated measuring equipment, and the reagents specified for the experiment.";
  const procedureSource =
    extractManualSection(upload.content, ["Procedure", "Method", "Experimental Procedure"]) ||
    upload.pages.map((page) => page.content).slice(0, 2).join("\n");
  const profile = inferLabProfile(upload.topic, upload.content);
  const generatedResults = buildGeneratedResults(profile, args.observedData);
  const references = await buildAiReferences(upload.topic);

  const report = {
    title,
    objective,
    introduction:
      `This experiment investigated ${upload.topic.toLowerCase()} by applying the theoretical ideas outlined in the practical manual to a structured laboratory setting. The exercise linked chemical principles to observation, data handling, and interpretation in a form suitable for academic reporting and examination preparation.`,
    apparatusAndReagents,
    procedure: toProcedureProse(procedureSource, upload.topic),
    results: generatedResults.results,
    observations: generatedResults.observations,
    calculations: generatedResults.calculations,
    discussion:
      `The generated and observed results followed the expected behaviour for ${upload.topic.toLowerCase()}. Any deviation from the ideal trend could reasonably be attributed to reading uncertainty, endpoint judgement, heat loss, timing delay, contamination, or instrumental error depending on the experiment. Even so, the overall pattern remained chemically sensible and supported the principle described in the manual.`,
    conclusion:
      `The objective of the experiment was achieved because the practical observations and processed values supported the expected ${upload.topic.toLowerCase()} behaviour. The report therefore demonstrates the connection between theory, laboratory method, and chemical interpretation.`,
    references,
  };

  const artifact = await createArtifactWithCitations({
    userId: args.userId,
    type: "lab_report",
    title: `Lab report: ${title}`,
    prompt: upload.title,
    body: [
      `Title: ${report.title}`,
      `Objective: ${report.objective}`,
      `Introduction: ${report.introduction}`,
      `Apparatus and Reagents: ${report.apparatusAndReagents}`,
      `Procedure: ${report.procedure}`,
      `Results: ${report.results}`,
      `Observations: ${report.observations}`,
      `Discussion / Calculations: ${report.calculations}\n\n${report.discussion}`,
      `Conclusion: ${report.conclusion}`,
      `References: ${report.references.join("; ")}`,
    ].join("\n\n"),
    payload: report as unknown as Prisma.InputJsonValue,
    citations: upload.pages.slice(0, 2).map((page) => ({
      uploadId: upload.id,
      uploadPageId: page.id,
      pageNumber: page.pageNumber,
      sectionTitle: page.sectionTitle,
      snippet: page.content.slice(0, 220),
    })),
    confidence: 0.88,
  });

  return {
    artifactId: artifact.id,
    ...report,
    citations: artifact.citations,
  };
}
