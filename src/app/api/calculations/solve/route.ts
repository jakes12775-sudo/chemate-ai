import { z } from "zod";
import { authorizeApiRequest } from "@/lib/auth/session";
import {
  type CalculationRequest,
  solveCalculation,
} from "@/lib/chemate/calculations";
import { jsonError, jsonOk } from "@/lib/http";

const schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("stoichiometry"),
    input: z.object({
      knownMoles: z.number().positive(),
      knownCoefficient: z.number().positive(),
      targetCoefficient: z.number().positive(),
      targetName: z.string().trim().min(1).max(60),
    }),
  }),
  z.object({
    mode: z.literal("kinetics"),
    input: z.object({
      initialConcentration: z.number().positive(),
      rateConstant: z.number().positive(),
      time: z.number().nonnegative(),
    }),
  }),
  z.object({
    mode: z.literal("electrochemistry"),
    input: z.object({
      cathodePotential: z.number(),
      anodePotential: z.number(),
      electrons: z.number().int().positive(),
    }),
  }),
  z.object({
    mode: z.literal("thermodynamics"),
    input: z.object({
      mass: z.number().positive(),
      specificHeatCapacity: z.number().positive(),
      deltaTemperature: z.number(),
    }),
  }),
  z.object({
    mode: z.literal("gas_law"),
    input: z.object({
      volume: z.number().positive(),
      moles: z.number().positive(),
      temperature: z.number().positive(),
    }),
  }),
]);

export async function POST(request: Request) {
  const auth = await authorizeApiRequest();

  if ("response" in auth) {
    return auth.response;
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonError("Invalid calculation request.", 400, parsed.error.issues);
  }

  const result = await solveCalculation(
    auth.session.user.id,
    parsed.data as CalculationRequest,
  );

  return jsonOk(result);
}
