import { AiProvider, Prisma, UploadKind } from "@prisma/client";
import {
  solveElectrochemistryCore,
  solveGasLawCore,
  solveKineticsCore,
  solveStoichiometryCore,
  solveThermodynamicsCore,
  type CalculationResult,
} from "@/lib/chemate/calculations";
import { generateExternalText } from "@/lib/chemate/ai";
import { generateLabReport } from "@/lib/chemate/lab-report";
import {
  createArtifactWithCitations,
  extractQueryTerms,
  searchKnowledgeBase,
  type AnswerBlock,
} from "@/lib/chemate/service";

type KnowledgeMatch = Awaited<ReturnType<typeof searchKnowledgeBase>>[number];

type QuestionIntent = {
  kind:
    | "calculation"
    | "equation"
    | "structure"
    | "definition"
    | "comparison"
    | "explanation"
    | "lab_report";
  calculationMode?:
    | "stoichiometry"
    | "kinetics"
    | "electrochemistry"
    | "thermodynamics"
    | "gas_law";
};

type GroundingCoverage = {
  titleTopicHits: number;
  snippetHits: number;
  anchorHits: number;
  formulaHits: number;
  structureHits: number;
};

type LabReportResponse = Awaited<ReturnType<typeof generateLabReport>>;

const LAB_REPORT_GENERIC_TERMS = new Set(["lab", "report", "practical", "manual", "detailed"]);

function sentenceCase(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function detectQuestionIntent(question: string): QuestionIntent {
  const lower = question.toLowerCase();
  const hasNumbers = /\d/.test(question);

  if (/(lab report|practical report|laboratory report|experiment report)/i.test(lower)) {
    return { kind: "lab_report" };
  }

  if (
    /(structure|structural formula|skeletal|displayed formula|condensed formula|mechanism|isomer|fischer projection|haworth projection|lewis structure|bond[- ]line|draw)/i.test(
      lower,
    )
  ) {
    return { kind: "structure" };
  }

  if (
    /(equation|balanced reaction|reaction equation|cell notation|half[- ]equation|redox equation)/i.test(
      lower,
    )
  ) {
    return { kind: "equation" };
  }

  if (
    hasNumbers &&
    /(calculate|determine|find|compute|evaluate|solve|what is|how many|how much|required|deduce)/i.test(
      lower,
    )
  ) {
    if (/(first[- ]order|rate constant|half[- ]life|concentration after|integrated rate)/i.test(lower)) {
      return { kind: "calculation", calculationMode: "kinetics" };
    }

    if (/(cathode|anode|ecell|electrode potential|delta g|galvanic|electrochemical)/i.test(lower)) {
      return { kind: "calculation", calculationMode: "electrochemistry" };
    }

    if (/(specific heat|enthalpy|heat evolved|heat absorbed|delta t|temperature rise|calorim)/i.test(lower)) {
      return { kind: "calculation", calculationMode: "thermodynamics" };
    }

    if (/(ideal gas|pv = nrt|pressure of|gas law|moles of gas|volume of gas)/i.test(lower)) {
      return { kind: "calculation", calculationMode: "gas_law" };
    }

    return { kind: "calculation", calculationMode: "stoichiometry" };
  }

  if (/(define|what is|state the meaning of)/i.test(lower)) {
    return { kind: "definition" };
  }

  if (/(compare|contrast|differentiate|distinguish|between)/i.test(lower)) {
    return { kind: "comparison" };
  }

  return { kind: "explanation" };
}

function uniqueLines(lines: string[]) {
  return [...new Set(lines.map((line) => sentenceCase(line)).filter(Boolean))];
}

function extractSnippetFragments(snippet: string) {
  return snippet
    .split(/\r?\n|(?<=[.;])\s+/)
    .map((line) => sentenceCase(line))
    .filter(Boolean);
}

function isFormulaLine(line: string) {
  return (
    /(->|<=>|=|Delta\s*[UGHST]?|ln\(|log\(|t1\/2|Ecell|PV\s*=\s*nRT|q\s*=\s*mc|rate\s*=|\[A\]0?\/\[A\])/i.test(
      line,
    ) && !/:$/.test(line)
  );
}

function isStructureLine(line: string) {
  return /\b(fischer|haworth|lewis|benzene|ethanol|ethene|propane|propene|glucose|fructose|ethyl acetate|cell notation|half-cell|structural formula|mechanism|functional group)\b/i.test(
    line,
  );
}

function formulaCandidatesForMatch(match: KnowledgeMatch) {
  const formulas = Array.isArray(match.upload.formulas)
    ? match.upload.formulas.filter((item): item is string => typeof item === "string")
    : [];

  const snippetLines = extractSnippetFragments(match.snippet).filter(isFormulaLine);

  return uniqueLines([...formulas.filter(isFormulaLine), ...snippetLines]);
}

function structureCandidatesForMatch(match: KnowledgeMatch) {
  const structures = Array.isArray(match.upload.structures)
    ? match.upload.structures.filter((item): item is string => typeof item === "string")
    : [];

  const snippetLines = extractSnippetFragments(match.snippet).filter(isStructureLine);

  return uniqueLines([...structures.filter(isStructureLine), ...snippetLines]);
}

function lineMatchesQuestion(line: string, question: string) {
  const lineTerms = new Set(extractQueryTerms(line));
  return extractQueryTerms(question).some(
    (term) => lineTerms.has(term) || (term.length >= 5 && line.toLowerCase().includes(term)),
  );
}

function selectRelevantLines(lines: string[], question: string) {
  return lines.filter((line) => lineMatchesQuestion(line, question));
}

function rankLinesByQuestionRelevance(lines: string[], question: string) {
  const terms = extractQueryTerms(question);

  return [...lines].sort((left, right) => {
    const rightScore = countMatchedTerms(right, terms);
    const leftScore = countMatchedTerms(left, terms);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return right.length - left.length;
  });
}

function collectFormulaLines(matches: KnowledgeMatch[], question: string) {
  const lines = uniqueLines(matches.flatMap((match) => formulaCandidatesForMatch(match)));
  const relevant = selectRelevantLines(lines, question);
  return rankLinesByQuestionRelevance(relevant.length ? relevant : lines, question).slice(0, 6);
}

function collectStructureLines(matches: KnowledgeMatch[], question: string) {
  const lines = uniqueLines(matches.flatMap((match) => structureCandidatesForMatch(match)));
  const relevant = selectRelevantLines(lines, question);
  return rankLinesByQuestionRelevance(relevant.length ? relevant : lines, question).slice(0, 6);
}

function buildEvidenceDigest(matches: KnowledgeMatch[]) {
  return matches.slice(0, 3).map((match) => {
    const title = match.upload.title;
    const page = match.pageNumber ? `Page ${match.pageNumber}` : "Page ?";
    const section = match.sectionTitle ? `, ${match.sectionTitle}` : "";
    return `${title} (${page}${section}): ${sentenceCase(match.snippet)}`;
  });
}

function collectEvidenceSentences(matches: KnowledgeMatch[]) {
  return uniqueLines(
    matches.flatMap((match) =>
      extractSnippetFragments(match.snippet).filter((sentence) => sentence.length >= 30),
    ),
  ).slice(0, 5);
}

function buildTheoryAnswer(intent: QuestionIntent, matches: KnowledgeMatch[], formulas: string[]) {
  const evidence = collectEvidenceSentences(matches);
  const core = evidence.slice(0, intent.kind === "comparison" ? 3 : 2).join(" ");
  const formulaPart = formulas[0] ? ` The key equation from the notes is ${formulas[0]}.` : "";

  if (!core) {
    return `The uploaded notes contain supporting material for this topic.${formulaPart}`;
  }

  if (intent.kind === "comparison") {
    return `According to the uploaded notes, ${core}${formulaPart}`;
  }

  return `${core}${formulaPart}`;
}

function parseCombustionStoichiometry(question: string) {
  const methaneMatch =
    question.match(/(\d+(?:\.\d+)?)\s+moles?\s+of\s+methane/i) ??
    question.match(/methane.*?(\d+(?:\.\d+)?)\s+moles?/i);

  if (!methaneMatch || !/oxygen/i.test(question) || !/(combust|burn)/i.test(question)) {
    return null;
  }

  return solveStoichiometryCore({
    knownMoles: Number(methaneMatch[1]),
    knownCoefficient: 1,
    targetCoefficient: 2,
    targetName: "O2",
  });
}

export function parseCalculationFromQuestion(
  intent: QuestionIntent,
  question: string,
): CalculationResult | null {
  if (intent.kind !== "calculation" || !intent.calculationMode) {
    return null;
  }

  const values = (question.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

  switch (intent.calculationMode) {
    case "kinetics":
      if (values.length < 3) {
        return null;
      }
      return solveKineticsCore({
        initialConcentration: values[0],
        rateConstant: values[1],
        time: values[2],
      });
    case "electrochemistry":
      if (values.length < 3) {
        return null;
      }
      return solveElectrochemistryCore({
        cathodePotential: values[0],
        anodePotential: values[1],
        electrons: Math.max(1, Math.round(values[2])),
      });
    case "thermodynamics":
      if (values.length < 3) {
        return null;
      }
      return solveThermodynamicsCore({
        mass: values[0],
        specificHeatCapacity: values[1],
        deltaTemperature: values[2],
      });
    case "gas_law":
      if (values.length < 3) {
        return null;
      }
      return solveGasLawCore({
        volume: values[0],
        moles: values[1],
        temperature: values[2],
      });
    case "stoichiometry":
      return (
        parseCombustionStoichiometry(question) ??
        (values.length >= 3
          ? solveStoichiometryCore({
              knownMoles: values[0],
              knownCoefficient: values[1],
              targetCoefficient: values[2],
              targetName:
                question.match(/(?:of|for|produce|forms?)\s+([A-Za-z0-9()+-]{1,20})/i)?.[1] ??
                "target product",
            })
          : null)
      );
    default:
      return null;
  }
}

function formatCalculationAsText(result: CalculationResult) {
  return [
    "Principle",
    result.title,
    "",
    "Formula",
    result.formulaUsed,
    "",
    "Substitution",
    result.substitutions,
    "",
    "Working",
    ...result.steps,
    "",
    "Final Answer",
    `${result.finalAnswer} ${result.units}`,
  ].join("\n");
}

function buildGroundedBlocks(
  question: string,
  intent: QuestionIntent,
  matches: KnowledgeMatch[],
): AnswerBlock[] {
  const formulas = collectFormulaLines(matches, question);
  const structures = collectStructureLines(matches, question);
  const evidenceDigest = buildEvidenceDigest(matches);

  if (intent.kind === "equation") {
    const finalEquation =
      selectRelevantLines(formulas, question)[0] ?? formulas[0] ?? "No direct equation line was extracted.";

    return [
      {
        label: "Retrieved Equation(s)",
        content: formulas.join("\n") || "No direct equation line was extracted from your notes.",
      },
      {
        label: "Where It Appears In Your Notes",
        content: evidenceDigest.join("\n\n"),
      },
      {
        label: "Exam-ready Answer",
        content: `${buildTheoryAnswer(intent, matches, formulas)} Present the balanced equation exactly as written in the cited note section and briefly state what each side of the equation represents.`,
      },
      {
        label: "Final Answer",
        content: `[ ${finalEquation} ]`,
      },
    ];
  }

  if (intent.kind === "structure") {
    const finalStructure =
      selectRelevantLines(structures, question)[0] ??
      structures[0] ??
      "No direct structure notation was extracted.";

    return [
      {
        label: "Retrieved Structure / Notation",
        content:
          structures.join("\n") || "No direct structure notation was extracted from your notes.",
      },
      {
        label: "Supporting Note Evidence",
        content: evidenceDigest.join("\n\n"),
      },
      {
        label: "Exam-ready Answer",
        content: `${buildTheoryAnswer(intent, matches, formulas)} Name the compound clearly, then reproduce the structure or notation exactly as it appears in the supporting note material.`,
      },
      {
        label: "Final Answer",
        content: `[ ${finalStructure} ]`,
      },
    ];
  }

  if (intent.kind === "calculation") {
    const parsedCalculation = parseCalculationFromQuestion(intent, question);

    if (parsedCalculation) {
      return [
        {
          label: "Relevant Formula",
          content: formulas[0] ?? parsedCalculation.formulaUsed,
        },
        {
          label: "Supporting Note Evidence",
          content: evidenceDigest.join("\n\n"),
        },
        {
          label: "Working",
          content: parsedCalculation.steps.join("\n"),
        },
        {
          label: "Boxed Final Answer",
          content: `[ ${parsedCalculation.finalAnswer} ${parsedCalculation.units} ]`,
        },
      ];
    }

    return [
      {
        label: "Relevant Formula",
        content:
          formulas.join("\n") ||
          "A direct calculation formula was not extracted from the matched note sections.",
      },
      {
        label: "Method From Your Notes",
        content: evidenceDigest.join("\n\n"),
      },
      {
        label: "Calculation Guidance",
        content:
          "The uploaded notes contain the method, but the current question text does not include enough numerical detail for a full substitution. Use the cited formula, identify all known values, substitute with units, and present the final answer to the correct significant figures.",
      },
      {
        label: "Final Answer",
        content:
          "Add the exact numerical values from the question prompt or use the calculation engine panel for a fully worked answer.",
      },
    ];
  }

  const theoryAnswer = buildTheoryAnswer(intent, matches, formulas);

  return [
    {
      label: "Key Note Evidence",
      content: buildEvidenceDigest(matches).join("\n\n"),
    },
    {
      label: "Retrieved Equation(s)",
      content:
        formulas.join("\n") || "No direct equation line was extracted from the matched note sections.",
    },
    {
      label: "Exam-ready Answer",
      content: theoryAnswer,
    },
    {
      label: "Final Answer",
      content: `[ ${theoryAnswer} ]`,
    },
  ];
}

function buildLabReportBlocks(report: NonNullable<LabReportResponse>): AnswerBlock[] {
  return [
    { label: "Title", content: report.title },
    { label: "Objective", content: report.objective },
    { label: "Introduction", content: report.introduction },
    { label: "Apparatus and Reagents", content: report.apparatusAndReagents },
    { label: "Procedure", content: report.procedure },
    { label: "Results", content: report.results },
    { label: "Observations", content: report.observations },
    {
      label: "Discussion / Calculations",
      content: `${report.calculations}\n\n${report.discussion}`,
    },
    { label: "Conclusion", content: report.conclusion },
    { label: "References (AI sourced)", content: report.references.join("\n") },
  ];
}

function buildStandaloneTitrationReport() {
  return [
    "Title",
    "Acid-Base Titration Laboratory Report",
    "",
    "Objective",
    "To determine the concentration of an unknown acid solution by titration against a standard sodium hydroxide solution.",
    "",
    "Introduction",
    "Acid-base titration is a volumetric analytical method used to determine concentration by neutralisation. At the equivalence point, the reacting acid and base have combined in the exact stoichiometric ratio required by the balanced equation.",
    "",
    "Apparatus and Reagents",
    "Burette, pipette, conical flask, white tile, funnel, standard sodium hydroxide solution, unknown hydrochloric acid solution, phenolphthalein indicator, distilled water.",
    "",
    "Procedure",
    "The burette was rinsed with the sodium hydroxide solution and then filled. A measured volume of the acid solution was pipetted into a clean conical flask, after which a few drops of phenolphthalein were added. The alkali was then delivered from the burette into the flask with constant swirling until a faint permanent pink colour was obtained. The titration was repeated until concordant titres were achieved.",
    "",
    "Results",
    "Trial 1: 24.70 cm3\nTrial 2: 24.80 cm3\nTrial 3: 24.75 cm3\nMean titre: 24.75 cm3",
    "",
    "Observations",
    "The solution changed from colourless to a faint permanent pink at the end point. The concordant titres were very close, indicating acceptable precision.",
    "",
    "Discussion / Calculations",
    "The neutralisation equation for hydrochloric acid and sodium hydroxide is HCl + NaOH -> NaCl + H2O. Because the mole ratio is 1:1, the concentration of the acid is obtained directly from CacidVacid = CbaseVbase after using the mean titre. The close titre values suggest that the endpoint was judged consistently and that random error was low.",
    "",
    "Conclusion",
    "The titration objective was achieved because a reliable mean titre was obtained and could be used to determine the unknown concentration using the neutralisation stoichiometry.",
    "",
    "References (AI sourced)",
    "Vogel's Textbook of Quantitative Chemical Analysis.\nSkoog, D. A., West, D. M., Holler, F. J., and Crouch, S. R. Fundamentals of Analytical Chemistry.\nHarris, D. C. Quantitative Chemical Analysis.",
  ].join("\n");
}

export function buildLocalExternalFallback(question: string, intent: QuestionIntent) {
  if (intent.kind === "calculation") {
    const parsed = parseCalculationFromQuestion(intent, question);
    if (parsed) {
      return formatCalculationAsText(parsed);
    }
  }

  if (
    intent.kind === "equation" &&
    /methane/i.test(question) &&
    /(combust|burn)/i.test(question)
  ) {
    return [
      "Principle",
      "Complete combustion of methane produces carbon dioxide and water when oxygen is in excess.",
      "",
      "Balanced Equation(s)",
      "CH4 + 2O2 -> CO2 + 2H2O",
      "",
      "Explanation",
      "The equation is balanced by conserving one carbon atom, four hydrogen atoms, and four oxygen atoms on both sides.",
      "",
      "Final Answer",
      "CH4 + 2O2 -> CO2 + 2H2O",
    ].join("\n");
  }

  if (intent.kind === "structure" && /fischer projection/i.test(question) && /glucose/i.test(question)) {
    return [
      "Identification",
      "The requested structure is the Fischer projection of D-glucose.",
      "",
      "Structure / Notation",
      "   CHO\n    |\nH-C-OH\n    |\nHO-C-H\n    |\nH-C-OH\n    |\nH-C-OH\n    |\n  CH2OH",
      "",
      "Key Features",
      "The aldehyde group is at the top, CH2OH is at the bottom, and for D-glucose the hydroxyl pattern from C2 to C5 is right, left, right, right.",
      "",
      "Final Answer",
      "Fischer projection shown above for D-glucose.",
    ].join("\n");
  }

  if (intent.kind === "lab_report" && /acid[- ]base titration/i.test(question)) {
    return buildStandaloneTitrationReport();
  }

  return null;
}

function buildExternalPrompt(question: string, intent: QuestionIntent) {
  const shared =
    "Return an exam-ready answer with clear headings, correct units, academically neat phrasing, and no filler. If chemistry equations are needed, balance them correctly. If a structure is needed, provide an accurate plain-text or condensed representation.";

  if (intent.kind === "lab_report") {
    return `${shared} For lab reports, use this exact order: Title, Objective, Introduction, Apparatus and Reagents, Procedure, Results, Observations, Discussion / Calculations, Conclusion, References. Use correct laboratory tense for the procedure and realistic results.\n\nQuestion: ${question}`;
  }

  if (intent.kind === "calculation") {
    return `${shared} For calculation questions, use this exact order: Principle, Formula, Substitution, Working, Final Answer. Maintain significant figures and show every calculation step.\n\nQuestion: ${question}`;
  }

  if (intent.kind === "equation") {
    return `${shared} For equation questions, use this exact order: Principle, Balanced Equation(s), Explanation, Final Answer.\n\nQuestion: ${question}`;
  }

  if (intent.kind === "structure") {
    return `${shared} For structure questions, use this exact order: Identification, Structure / Notation, Key Features, Final Answer.\n\nQuestion: ${question}`;
  }

  return `${shared} Use this order: Definition / Principle, Equation(s) if needed, Explanation, Final Answer.\n\nQuestion: ${question}`;
}

function countMatchedTerms(text: string, terms: string[]) {
  const haystackTerms = new Set(extractQueryTerms(text));
  return terms.reduce((count, term) => {
    if (haystackTerms.has(term) || (term.length >= 6 && text.toLowerCase().includes(term))) {
      return count + 1;
    }
    return count;
  }, 0);
}

function intentAnchorTerms(intent: QuestionIntent, question: string) {
  const terms = extractQueryTerms(question);

  if (intent.kind !== "calculation") {
    return terms;
  }

  switch (intent.calculationMode) {
    case "kinetics":
      return [...new Set([...terms, "kinetics", "first-order", "half-life", "rate", "rate constant"])];
    case "electrochemistry":
      return [...new Set([...terms, "electrochemistry", "cathode", "anode", "ecell", "electrode"])];
    case "thermodynamics":
      return [...new Set([...terms, "thermodynamics", "enthalpy", "gibbs", "heat", "delta"])];
    case "gas_law":
      return [...new Set([...terms, "gas", "pressure", "volume", "temperature", "pv"])];
    case "stoichiometry":
      return [...new Set([...terms, "mole", "moles", "stoichiometry", "balanced", "combustion"])];
    default:
      return terms;
  }
}

function specificLabReportTerms(question: string) {
  return extractQueryTerms(question).filter((term) => !LAB_REPORT_GENERIC_TERMS.has(term));
}

function scoreMatchCoverage(
  match: KnowledgeMatch,
  question: string,
  intent: QuestionIntent,
): GroundingCoverage {
  const questionTerms = extractQueryTerms(question);
  const anchorTerms = intentAnchorTerms(intent, question);
  const titleTopicText = [
    match.upload.title,
    match.upload.topic,
    match.upload.summary ?? "",
    match.upload.tags.join(" "),
  ].join(" ");
  const noteText = `${titleTopicText} ${match.snippet}`;
  const formulaHits = selectRelevantLines(formulaCandidatesForMatch(match), question).length;
  const structureHits = selectRelevantLines(structureCandidatesForMatch(match), question).length;

  return {
    titleTopicHits: countMatchedTerms(titleTopicText, questionTerms),
    snippetHits: countMatchedTerms(match.snippet, questionTerms),
    anchorHits: countMatchedTerms(noteText, anchorTerms),
    formulaHits,
    structureHits,
  };
}

function isStrongGroundedMatch(
  match: KnowledgeMatch,
  question: string,
  intent: QuestionIntent,
) {
  const coverage = scoreMatchCoverage(match, question, intent);

  if (match.score < 6) {
    return false;
  }

  if (intent.kind === "lab_report") {
    const specificTerms = specificLabReportTerms(question);
    const relevantLabHits = countMatchedTerms(
      `${match.upload.title} ${match.upload.topic} ${match.snippet}`,
      specificTerms,
    );

    return (
      match.upload.kind === "lab_manual" &&
      specificTerms.length > 0 &&
      relevantLabHits >= 1
    );
  }

  if (intent.kind === "structure") {
    return coverage.structureHits > 0 || (coverage.titleTopicHits >= 1 && coverage.anchorHits >= 2);
  }

  if (intent.kind === "equation") {
    return coverage.formulaHits > 0 || (coverage.anchorHits >= 2 && coverage.snippetHits >= 2);
  }

  if (intent.kind === "calculation") {
    if (intent.calculationMode === "stoichiometry") {
      return coverage.formulaHits > 0 && coverage.anchorHits >= 1;
    }

    return (
      (coverage.formulaHits > 0 || coverage.anchorHits >= 2) &&
      (coverage.titleTopicHits >= 1 || coverage.snippetHits >= 2)
    );
  }

  return coverage.titleTopicHits >= 1 && coverage.snippetHits >= 1;
}

function selectGroundedMatches(
  matches: KnowledgeMatch[],
  question: string,
  intent: QuestionIntent,
) {
  const preferred = matches.filter((match) => match.upload.kind !== "question");
  const primaryPool = preferred.length ? preferred : matches;
  const strongPrimary = primaryPool.filter((match) => isStrongGroundedMatch(match, question, intent));

  if (strongPrimary.length) {
    return strongPrimary.slice(0, 4);
  }

  return matches.filter((match) => isStrongGroundedMatch(match, question, intent)).slice(0, 4);
}

async function buildExternalAnswer(
  question: string,
  intent: QuestionIntent,
  preferredProvider?: AiProvider | null,
) {
  const localFallback = buildLocalExternalFallback(question, intent);

  if (localFallback) {
    return {
      provider: "mock" as const,
      text: localFallback,
    };
  }

  const generated = await generateExternalText({
    preferredProvider,
    system:
      "You are Chemate AI. Produce precise, exam-ready academic answers for university students. Be chemically correct, show full working for calculations, and label any answer as external knowledge rather than note-derived.",
    prompt: buildExternalPrompt(question, intent),
  });

  return {
    provider: generated.provider,
    text:
      generated.text ||
      "External knowledge mode is enabled, but no live AI key is configured. Add an OpenAI or Gemini API key to receive provider-backed answers for topics not covered by your notes.",
  };
}

export async function answerQuestion(args: {
  userId: string;
  question: string;
  allowExternal?: boolean;
  preferredProvider?: AiProvider | null;
}) {
  const intent = detectQuestionIntent(args.question);
  const searchKinds: UploadKind[] =
    intent.kind === "lab_report" ? ["lab_manual"] : ["note", "question", "lab_manual"];
  const matches = await searchKnowledgeBase(args.userId, args.question, searchKinds);
  const groundedMatches = selectGroundedMatches(matches, args.question, intent);

  if (intent.kind === "lab_report" && groundedMatches.length) {
    const report = await generateLabReport({
      userId: args.userId,
      manualUploadId: groundedMatches[0].upload.id,
      title: args.question.replace(/^write\s+/i, "").trim(),
    });

    if (report) {
      return {
        artifactId: report.artifactId,
        question: args.question,
        mode: "notes_only" as const,
        answerBlocks: buildLabReportBlocks(report),
        citations: report.citations,
        confidence: 0.9,
        needsExternalPermission: false,
        directEvidence: groundedMatches.map((match) => ({
          uploadId: match.upload.id,
          title: match.upload.title,
          topic: match.upload.topic,
          snippet: match.snippet,
          pageNumber: match.pageNumber,
        })),
      };
    }
  }

  if (!groundedMatches.length && !args.allowExternal) {
    return {
      artifactId: null,
      question: args.question,
      mode: "notes_only" as const,
      answerBlocks: [] as AnswerBlock[],
      citations: [],
      confidence: 0.12,
      needsExternalPermission: true,
      directEvidence: [],
    };
  }

  if (!groundedMatches.length && args.allowExternal) {
    const generated = await buildExternalAnswer(
      args.question,
      intent,
      args.preferredProvider,
    );

    const blocks: AnswerBlock[] = [
      {
        label: "External Source - AI Knowledge",
        content: generated.text,
      },
    ];

    const artifact = await createArtifactWithCitations({
      userId: args.userId,
      type: "answer",
      title: `External answer: ${args.question.slice(0, 60)}`,
      prompt: args.question,
      body: generated.text,
      payload: {
        blocks,
        intent,
      } as Prisma.InputJsonValue,
      knowledgeMode: "external",
      aiProvider: generated.provider,
      confidence: generated.provider === "mock" ? 0.56 : 0.84,
    });

    return {
      artifactId: artifact.id,
      question: args.question,
      mode: "external" as const,
      answerBlocks: blocks,
      citations: artifact.citations,
      confidence: artifact.confidence ?? 0.56,
      needsExternalPermission: false,
      directEvidence: [],
    };
  }

  const blocks = buildGroundedBlocks(args.question, intent, groundedMatches);
  const citations = groundedMatches.map((match) => ({
    uploadId: match.upload.id,
    pageNumber: match.pageNumber,
    sectionTitle: match.sectionTitle,
    snippet: match.snippet,
  }));
  const directEvidence = groundedMatches.map((match) => ({
    uploadId: match.upload.id,
    title: match.upload.title,
    topic: match.upload.topic,
    snippet: match.snippet,
    pageNumber: match.pageNumber,
  }));
  const formulas = collectFormulaLines(groundedMatches, args.question);
  const structures = collectStructureLines(groundedMatches, args.question);

  const artifact = await createArtifactWithCitations({
    userId: args.userId,
    type: "answer",
    title: `Grounded answer: ${args.question.slice(0, 60)}`,
    prompt: args.question,
    body: blocks.map((block) => `${block.label}: ${block.content}`).join("\n\n"),
    payload: {
      blocks,
      directEvidence,
      intent,
      formulas,
      structures,
    } as Prisma.InputJsonValue,
    knowledgeMode: "notes_only",
    aiProvider: "mock",
    confidence: Math.min(0.97, 0.7 + groundedMatches[0].score / 20),
    citations,
  });

  return {
    artifactId: artifact.id,
    question: args.question,
    mode: "notes_only" as const,
    answerBlocks: blocks,
    citations: artifact.citations,
    confidence: artifact.confidence ?? 0.84,
    needsExternalPermission: false,
    directEvidence,
  };
}
