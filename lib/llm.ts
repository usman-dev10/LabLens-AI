import "server-only";

import OpenAI from "openai";
import { z } from "zod";

const CALL_TIMEOUT_MS = 45_000;

type Provider = {
  apiKey: string;
  baseURL: string;
  model: string;
};

export class ModelConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelConfigurationError";
  }
}

export class ModelCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelCallError";
  }
}

function configuredProvider(kind: "primary" | "fallback"): Provider | null {
  const prefix = kind === "primary" ? "XAI" : "FALLBACK";
  const apiKey = process.env[`${prefix}_API_KEY`];
  const baseURL = process.env[`${prefix}_BASE_URL`];
  const model = process.env[`${prefix}_MODEL`];

  if (!apiKey && !baseURL && !model) return null;
  if (!apiKey || !baseURL || !model) {
    throw new ModelConfigurationError(
      `${prefix} provider configuration is incomplete. Set its API key, base URL, and model.`,
    );
  }

  return { apiKey, baseURL, model };
}

function jsonFromContent(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse(fenced ?? content);
}

async function requestJson(
  provider: Provider,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<unknown> {
  const client = new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseURL,
    timeout: CALL_TIMEOUT_MS,
    maxRetries: 0,
  });
  const response = await client.chat.completions.create({
    model: provider.model,
    response_format: { type: "json_object" },
    messages,
  });
  const content = response.choices[0]?.message.content;
  if (!content) throw new ModelCallError("The model returned an empty response.");
  return jsonFromContent(content);
}

export async function callJsonWithRetry<TSchema extends z.ZodType>(options: {
  schema: TSchema;
  system: string;
  prompt: string;
}): Promise<z.infer<TSchema>> {
  const primary = configuredProvider("primary");
  if (!primary) {
    throw new ModelConfigurationError(
      "No AI provider is configured. Add XAI_API_KEY, XAI_BASE_URL, and XAI_MODEL to .env.local.",
    );
  }

  const providers = [primary, configuredProvider("fallback")].filter(
    (provider): provider is Provider => provider !== null,
  );
  for (const provider of providers) {
    let validationFeedback = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const parsed = await requestJson(provider, [
          { role: "system", content: options.system },
          {
            role: "user",
            content:
              options.prompt +
              validationFeedback +
              "\nReturn only a valid JSON object; do not add a diagnosis or medication advice.",
          },
        ]);
        const result = options.schema.safeParse(parsed);
        if (result.success) return result.data;
        validationFeedback = `\nYour previous JSON failed validation. Fix these issues: ${result.error.issues
          .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
          .join("; ")}`;
      } catch {
        // Try once more with validation feedback, then continue to the fallback provider.
      }
    }
  }

  throw new ModelCallError(
    "Analysis is temporarily unavailable. Please try again in a moment.",
  );
}

export const modelSupportsFiles = process.env.MODEL_SUPPORTS_FILES === "true";
