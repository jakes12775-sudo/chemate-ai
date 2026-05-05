import { describe, expect, it } from "vitest";
import { detectQuestionIntent, buildLocalExternalFallback } from "@/lib/chemate/assistant";
import { extractQueryTerms } from "@/lib/chemate/service";

describe("Chemate assistant grounding helpers", () => {
  it("removes filler verbs from retrieval terms", () => {
    const terms = extractQueryTerms("Draw the Fischer projection of glucose.");

    expect(terms).toContain("glucose");
    expect(terms).toContain("fischer");
    expect(terms).not.toContain("draw");
    expect(terms).not.toContain("the");
  });

  it("detects lab report prompts explicitly", () => {
    const intent = detectQuestionIntent(
      "Write a detailed lab report for acid-base titration practical.",
    );

    expect(intent.kind).toBe("lab_report");
  });

  it("creates a local fallback for methane combustion stoichiometry", () => {
    const fallback = buildLocalExternalFallback(
      "How many moles of oxygen are required to completely combust 2 moles of methane?",
      { kind: "calculation", calculationMode: "stoichiometry" },
    );

    expect(fallback).toContain("Final Answer");
    expect(fallback).toContain("4 mol");
  });

  it("creates a local fallback for the Fischer projection of glucose", () => {
    const fallback = buildLocalExternalFallback("Draw the Fischer projection of glucose.", {
      kind: "structure",
    });

    expect(fallback).toContain("D-glucose");
    expect(fallback).toContain("CHO");
  });
});
