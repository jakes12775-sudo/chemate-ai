import { Prisma } from "@prisma/client";
import { createArtifactWithCitations } from "@/lib/chemate/service";

type StoichiometryInput = {
  knownMoles: number;
  knownCoefficient: number;
  targetCoefficient: number;
  targetName: string;
};

type KineticsInput = {
  initialConcentration: number;
  rateConstant: number;
  time: number;
};

type ElectrochemistryInput = {
  cathodePotential: number;
  anodePotential: number;
  electrons: number;
};

type ThermodynamicsInput = {
  mass: number;
  specificHeatCapacity: number;
  deltaTemperature: number;
};

type GasLawInput = {
  volume: number;
  moles: number;
  temperature: number;
};

export type CalculationRequest =
  | { mode: "stoichiometry"; input: StoichiometryInput }
  | { mode: "kinetics"; input: KineticsInput }
  | { mode: "electrochemistry"; input: ElectrochemistryInput }
  | { mode: "thermodynamics"; input: ThermodynamicsInput }
  | { mode: "gas_law"; input: GasLawInput };

export type CalculationResult = {
  title: string;
  formulaUsed: string;
  substitutions: string;
  steps: string[];
  finalAnswer: number;
  units: string;
  sigFigs: number;
  extra?: Record<string, number | string>;
};

function roundSig(value: number, sigFigs = 4) {
  if (!Number.isFinite(value) || value === 0) {
    return value;
  }

  return Number(value.toPrecision(sigFigs));
}

function formatSig(value: number, sigFigs = 4) {
  return Number.isFinite(value) ? value.toPrecision(sigFigs) : String(value);
}

export function solveStoichiometryCore(input: StoichiometryInput): CalculationResult {
  const result = (input.knownMoles * input.targetCoefficient) / input.knownCoefficient;

  return {
    title: `Stoichiometry calculation for ${input.targetName}`,
    formulaUsed: "n(target) = n(known) x coefficient(target) / coefficient(known)",
    substitutions: `${input.knownMoles} x ${input.targetCoefficient} / ${input.knownCoefficient}`,
    steps: [
      "Write the mole ratio from the balanced chemical equation.",
      "Use n(target) = n(known) x coefficient(target) / coefficient(known).",
      `Substitute: n(${input.targetName}) = ${input.knownMoles} x ${input.targetCoefficient} / ${input.knownCoefficient}.`,
      `Calculate: n(${input.targetName}) = ${formatSig(result)} mol.`,
      `Final answer: ${formatSig(result)} mol ${input.targetName}.`,
    ],
    finalAnswer: roundSig(result),
    units: "mol",
    sigFigs: 4,
  };
}

export function solveKineticsCore(input: KineticsInput): CalculationResult {
  const concentration =
    input.initialConcentration * Math.exp(-input.rateConstant * input.time);
  const halfLife = 0.693 / input.rateConstant;

  return {
    title: "First-order kinetics calculation",
    formulaUsed: "[A] = [A]0e^(-kt); t1/2 = 0.693 / k",
    substitutions: `${input.initialConcentration}e^(-${input.rateConstant} x ${input.time})`,
    steps: [
      "For a first-order reaction use [A] = [A]0e^(-kt).",
      `Substitute: [A] = ${input.initialConcentration}e^(-${input.rateConstant} x ${input.time}).`,
      `Concentration after time t = ${formatSig(concentration)} mol dm^-3.`,
      "For half-life use t1/2 = 0.693 / k.",
      `Substitute: t1/2 = 0.693 / ${input.rateConstant} = ${formatSig(halfLife)} time units.`,
      `Final answer: [A] = ${formatSig(concentration)} mol dm^-3.`,
    ],
    finalAnswer: roundSig(concentration),
    units: "mol dm^-3",
    sigFigs: 4,
    extra: {
      halfLife: roundSig(halfLife),
      halfLifeUnits: "time units",
    },
  };
}

export function solveElectrochemistryCore(input: ElectrochemistryInput): CalculationResult {
  const eCell = input.cathodePotential - input.anodePotential;
  const faraday = 96485;
  const deltaG = -input.electrons * faraday * eCell;

  return {
    title: "Electrochemistry cell calculation",
    formulaUsed: "Ecell = Ecathode - Eanode; Delta G = -nFEcell",
    substitutions: `${input.cathodePotential} - ${input.anodePotential}`,
    steps: [
      "Use Ecell = Ecathode - Eanode.",
      `Substitute: Ecell = ${input.cathodePotential} - ${input.anodePotential} = ${eCell.toFixed(3)} V.`,
      "Use Delta G = -nFEcell.",
      `Substitute: Delta G = -${input.electrons} x 96485 x ${eCell.toFixed(3)} = ${deltaG.toFixed(2)} J mol^-1.`,
      `Final answer: Ecell = ${eCell.toFixed(3)} V.`,
    ],
    finalAnswer: Number(eCell.toFixed(3)),
    units: "V",
    sigFigs: 3,
    extra: {
      deltaG: Number(deltaG.toFixed(2)),
      deltaGUnits: "J mol^-1",
    },
  };
}

export function solveThermodynamicsCore(input: ThermodynamicsInput): CalculationResult {
  const heat = input.mass * input.specificHeatCapacity * input.deltaTemperature;

  return {
    title: "Thermodynamics heat calculation",
    formulaUsed: "q = mcDeltaT",
    substitutions: `${input.mass} x ${input.specificHeatCapacity} x ${input.deltaTemperature}`,
    steps: [
      "Use q = mcDeltaT.",
      `Substitute: q = ${input.mass} x ${input.specificHeatCapacity} x ${input.deltaTemperature}.`,
      `Calculate: q = ${formatSig(heat)} J.`,
      `Final answer: q = ${formatSig(heat)} J.`,
    ],
    finalAnswer: roundSig(heat),
    units: "J",
    sigFigs: 4,
    extra: {
      kilojoules: roundSig(heat / 1000),
      kilojoulesUnits: "kJ",
    },
  };
}

export function solveGasLawCore(input: GasLawInput): CalculationResult {
  const gasConstant = 0.082057;
  const expectedPressure = (input.moles * gasConstant * input.temperature) / input.volume;

  return {
    title: "Ideal gas law calculation",
    formulaUsed: "PV = nRT",
    substitutions: `P = (${input.moles} x ${gasConstant} x ${input.temperature}) / ${input.volume}`,
    steps: [
      "Use the ideal gas equation PV = nRT.",
      "Rearrange for pressure: P = nRT / V.",
      `Substitute: P = (${input.moles} x ${gasConstant} x ${input.temperature}) / ${input.volume}.`,
      `Calculate: P = ${formatSig(expectedPressure)} atm.`,
      `Final answer: P = ${formatSig(expectedPressure)} atm.`,
    ],
    finalAnswer: roundSig(expectedPressure),
    units: "atm",
    sigFigs: 4,
    extra: {
      gasConstant,
      temperatureUnits: "K",
      volumeUnits: "dm^3",
    },
  };
}

function solveCore(request: CalculationRequest): CalculationResult {
  switch (request.mode) {
    case "stoichiometry":
      return solveStoichiometryCore(request.input);
    case "kinetics":
      return solveKineticsCore(request.input);
    case "electrochemistry":
      return solveElectrochemistryCore(request.input);
    case "thermodynamics":
      return solveThermodynamicsCore(request.input);
    case "gas_law":
      return solveGasLawCore(request.input);
    default: {
      const exhaustive: never = request;
      throw new Error(`Unsupported calculation mode: ${String(exhaustive)}`);
    }
  }
}

export async function solveCalculation(userId: string, request: CalculationRequest) {
  const solved = solveCore(request);

  const artifact = await createArtifactWithCitations({
    userId,
    type: "calculation",
    title: solved.title,
    body: [
      `Formula: ${solved.formulaUsed}`,
      `Substitution: ${solved.substitutions}`,
      "",
      ...solved.steps,
    ].join("\n"),
    payload: {
      mode: request.mode,
      ...solved,
    } as Prisma.InputJsonValue,
    confidence: 0.96,
  });

  return {
    artifactId: artifact.id,
    ...solved,
  };
}
