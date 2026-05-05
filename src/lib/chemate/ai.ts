import { AiProvider } from "@prisma/client";
import OpenAI from "openai";

type GenerateTextArgs = {
  preferredProvider?: AiProvider | null;
  system: string;
  prompt: string;
};

function resolveProvider(preferredProvider?: AiProvider | null) {
  if (preferredProvider && preferredProvider !== "mock") {
    return preferredProvider;
  }

  const configured = process.env.AI_PROVIDER?.toLowerCase();

  if (configured === "openai" || configured === "gemini") {
    return configured;
  }

  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }

  if (process.env.GEMINI_API_KEY) {
    return "gemini";
  }

  return "mock";
}

function createClient(provider: "openai" | "gemini") {
  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      return null;
    }

    return {
      provider,
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      client: new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      }),
    };
  }

  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  return {
    provider,
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    client: new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    }),
  };
}

export async function generateExternalText({ preferredProvider, system, prompt }: GenerateTextArgs) {
  const provider = resolveProvider(preferredProvider);

  if (provider === "mock") {
    return {
      provider: "mock" as const,
      text: "",
    };
  }

  const runtime = createClient(provider);

  if (!runtime) {
    return {
      provider: "mock" as const,
      text: "",
    };
  }

  const completion = await runtime.client.chat.completions.create({
    model: runtime.model,
    messages: [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return {
    provider: runtime.provider,
    text: completion.choices[0]?.message?.content ?? "",
  };
}
