import type { ModelPricing, UsageEvent } from "../types";
import { estimateCost } from "./pricing";

export function summarize(events: UsageEvent[], pricing: ModelPricing[]) {
  const totals = events.reduce(
    (a, e) => {
      const cost = estimateCost(e, pricing);
      a.input += e.input;
      a.output += e.output;
      a.cached += e.cached;
      a.cost += cost ?? 0;
      a.unpriced += Number(cost === null);
      a.latency += e.latency;
      return a;
    },
    { input: 0, output: 0, cached: 0, cost: 0, latency: 0, unpriced: 0 },
  );
  return {
    ...totals,
    tokens: totals.input + totals.output,
    requests: events.length,
    latency: events.length ? totals.latency / events.length : 0,
  };
}
export function breakdown(
  events: UsageEvent[],
  key: (event: UsageEvent) => string,
  pricing: ModelPricing[],
) {
  const groups = new Map<string, UsageEvent[]>();
  for (const event of events) {
    const name = key(event);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(event);
  }
  return [...groups].map(([name, rows]) => ({
    name,
    ...summarize(rows, pricing),
  }));
}
export const format = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
export const money = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  });
export function percentile(values: number[], p: number) {
  return (
    [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1] ?? 0
  );
}
