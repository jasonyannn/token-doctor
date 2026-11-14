import type { ModelPricing, UsageEvent } from "../types";

export const defaultPricing: ModelPricing[] = [
  {
    provider: "OpenAI",
    model: "GPT-6.1 Sol",
    input: 2.5,
    cached: 0.625,
    output: 10,
  },
  {
    provider: "Anthropic",
    model: "Claude Fable 5.2",
    input: 15,
    cached: 1.5,
    output: 75,
  },
  {
    provider: "Google",
    model: "Gemini 2.5 Flash",
    input: 0.3,
    cached: 0.03,
    output: 2.5,
  },
  {
    provider: "Anthropic",
    model: "Claude Sonnet 5.5",
    input: 3,
    cached: 0.3,
    output: 15,
  },
];
export function estimateCost(event: UsageEvent, pricing: ModelPricing[]) {
  const rate = pricing.find(
    (row) => row.provider === event.provider && row.model === event.model,
  );
  if (!rate || rate.cached > rate.input) return null;
  return (
    ((event.input - event.cached) * rate.input +
      event.cached * rate.cached +
      event.output * rate.output) /
    1_000_000
  );
}
