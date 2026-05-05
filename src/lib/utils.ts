export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function tokenize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function scoreTextMatch(query: string, candidate: string) {
  if (!query.trim()) {
    return 0.18;
  }

  const queryTokens = tokenize(query);
  const candidateTokens = tokenize(candidate);

  if (!queryTokens.length || !candidateTokens.length) {
    return 0;
  }

  const candidateSet = new Set(candidateTokens);
  const hits = queryTokens.reduce(
    (count, token) => count + Number(candidateSet.has(token)),
    0,
  );
  const phraseBonus = candidate.toLowerCase().includes(query.toLowerCase())
    ? 0.3
    : 0;

  return clamp(hits / queryTokens.length + phraseBonus, 0, 1.5);
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function toExcerpt(text: string, highlight: string, radius = 90) {
  const baseText = text.replace(/\s+/g, " ").trim();
  const index = baseText.toLowerCase().indexOf(highlight.toLowerCase());

  if (index === -1) {
    return `${baseText.slice(0, radius * 2).trim()}${baseText.length > radius * 2 ? "..." : ""}`;
  }

  const start = Math.max(0, index - radius);
  const end = Math.min(baseText.length, index + highlight.length + radius);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < baseText.length ? "..." : "";

  return `${prefix}${baseText.slice(start, end).trim()}${suffix}`;
}

export function unique<T>(items: T[]) {
  return [...new Set(items)];
}

export function formatNumber(value: number, maximumFractionDigits = 4) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

export function countSigFigs(value: number) {
  const normalized = value.toString().replace("-", "");

  if (!normalized.includes(".")) {
    return normalized.replace(/^0+/, "").length;
  }

  return normalized.replace(".", "").replace(/^0+/, "").length;
}

export function roundToSigFigs(value: number, sigFigs: number) {
  if (!Number.isFinite(value) || value === 0) {
    return 0;
  }

  return Number.parseFloat(value.toPrecision(sigFigs));
}

export function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function linearRegression(points: { x: number; y: number }[]) {
  const xBar = mean(points.map((point) => point.x));
  const yBar = mean(points.map((point) => point.y));

  let numerator = 0;
  let denominator = 0;

  for (const point of points) {
    numerator += (point.x - xBar) * (point.y - yBar);
    denominator += (point.x - xBar) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yBar - slope * xBar;

  return {
    slope,
    intercept,
  };
}

export function pickFirstSentence(text: string) {
  const sentence = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .find(Boolean);

  return sentence ?? text;
}

export function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function splitIntoParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
