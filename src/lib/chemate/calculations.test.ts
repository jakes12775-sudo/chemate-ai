import { describe, expect, it } from "vitest";
import {
  solveElectrochemistryCore,
  solveGasLawCore,
  solveKineticsCore,
  solveStoichiometryCore,
  solveThermodynamicsCore,
} from "@/lib/chemate/calculations";

describe("Chemate calculations", () => {
  it("solves stoichiometry with a balanced ratio", () => {
    const result = solveStoichiometryCore({
      knownMoles: 2,
      knownCoefficient: 1,
      targetCoefficient: 2,
      targetName: "H2O",
    });

    expect(result.finalAnswer).toBe(4);
    expect(result.units).toBe("mol");
  });

  it("solves first-order kinetics", () => {
    const result = solveKineticsCore({
      initialConcentration: 0.8,
      rateConstant: 0.12,
      time: 8,
    });

    expect(result.finalAnswer).toBeGreaterThan(0.3);
    expect(result.extra?.halfLife).toBeDefined();
  });

  it("solves electrochemistry and delta G", () => {
    const result = solveElectrochemistryCore({
      cathodePotential: 0.34,
      anodePotential: -0.76,
      electrons: 2,
    });

    expect(result.finalAnswer).toBe(1.1);
    expect(result.extra?.deltaG).toBeLessThan(0);
  });

  it("solves thermodynamics heat", () => {
    const result = solveThermodynamicsCore({
      mass: 100,
      specificHeatCapacity: 4.18,
      deltaTemperature: 6.3,
    });

    expect(result.finalAnswer).toBeCloseTo(2633, -1);
  });

  it("solves ideal gas pressure", () => {
    const result = solveGasLawCore({
      volume: 10,
      moles: 0.5,
      temperature: 298,
    });

    expect(result.finalAnswer).toBeGreaterThan(1);
    expect(result.units).toBe("atm");
  });
});
