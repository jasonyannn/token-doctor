import { defaultPricing } from "./pricing";
import type { UsageEvent } from "../types";

export const scenarios = [
  "Normal token usage",
  "Excessive input tokens",
  "Excessive output tokens",
  "Poor caching",
  "High-cost model usage",
  "Slow inference",
] as const;
export const applications = [
  "Customer Support AI",
  "Internal Document Assistant",
  "Marketing Content Generator",
  "Research Assistant",
];
const departments = ["Support", "Operations", "Marketing", "Research"];
const epoch = Date.UTC(2026, 10, 1);
export function simulate(
  index: number,
  scenario: number,
  live = false,
): UsageEvent {
  const source = live ? scenario % 4 : index % 4;
  const model =
    defaultPricing[
      scenario === 4 ? 1 : source === 2 ? 2 : source === 3 ? 3 : 0
    ];
  const input =
    scenario === 1
      ? 10000 + ((index * 137) % 5000)
      : 2600 + ((index * 197) % 2600);
  const output =
    scenario === 2
      ? 2300 + ((index * 51) % 1800)
      : (scenario === 4 ? 650 : 280) + ((index * 47) % 700);
  return {
    id: `${live ? "live" : "demo"}-${index}`,
    timestamp: new Date(
      epoch +
        (live
          ? 14 * 86400000 + index * 1000
          : Math.floor(index / 8) * 86400000 + (index % 8) * 3600000),
    ).toISOString(),
    provider: model.provider,
    model: model.model,
    application: applications[source],
    department: departments[source],
    fingerprint: `prefix-${source}-${scenario}`,
    task: scenario === 4 ? "classification" : "assistance",
    input,
    output,
    cached: Math.floor(input * (scenario === 3 ? 0.02 : 0.64)),
    latency:
      scenario === 5
        ? 5100 + ((index * 137) % 1900)
        : 420 + ((index * 71) % 900),
    simulated: true,
  };
}
export const demo = Array.from({ length: 112 }, (_, index) =>
  simulate(index, index % 8 < 2 ? 0 : (index % 8) - 2),
);
