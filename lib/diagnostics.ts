import type {
  Diagnosis,
  FindingKind,
  ModelPricing,
  Thresholds,
  UsageEvent,
} from "../types";
import { estimateCost } from "./pricing";
import { format, money } from "./analytics";

export const defaults: Thresholds = {
  input: 8000,
  output: 2000,
  cache: 30,
  cost: 0.06,
  latency: 3500,
};
export const minimumCacheSamples = 3;
export const rules = {
  input: [
    "Excessive input tokens",
    "Large inputs can increase spend and processing time. High usage is a review opportunity.",
    "Review the context sent with requests.",
    "Inspect retrieval limits, repeated history and instruction length. Compare answer quality with a smaller context.",
  ],
  output: [
    "Excessive output tokens",
    "Long responses can increase generation time and spend.",
    "Review response budgets.",
    "Set output limits and ask for a concise format. Verify completeness on representative tasks.",
  ],
  cache: [
    "Poor caching efficiency",
    "Repeated prefixes can cause repeated input processing.",
    "Investigate prompt caching.",
    "Check provider eligibility and keep reusable instructions at the start of the prompt. Measure reuse before and after.",
  ],
  cost: [
    "High-cost model usage",
    "Simple classified tasks may have lower-cost alternatives.",
    "Evaluate an alternative model.",
    "Run both models on a representative classification set. Compare quality, latency and estimated cost.",
  ],
  latency: [
    "Slow inference",
    "Slow responses can delay the application and its users.",
    "Investigate the slow requests.",
    "Compare requests by model and token volume. Measure time to first token and generation time in a real integration.",
  ],
} satisfies Record<FindingKind, string[]>;

const scope = (event: UsageEvent) =>
  JSON.stringify([event.provider, event.model, event.application]);
export class DiagnosisEngine {
  private prefixes = new Map<
    string,
    { events: UsageEvent[]; input: number; cached: number }
  >();
  constructor(
    private thresholds: Thresholds,
    private pricing: ModelPricing[],
    private now = () => new Date().toISOString(),
  ) {}
  process(event: UsageEvent) {
    const findings: Diagnosis[] = [];
    const t = this.thresholds;
    const add = (
      kind: FindingKind,
      severity: Diagnosis["severity"],
      evidence: string,
      threshold: string,
      events = [event],
      id = event.id,
    ) => {
      const [title, why, action, steps] = rules[kind];
      findings.push({
        id: JSON.stringify([kind, id]),
        kind,
        title,
        severity,
        evidence,
        threshold,
        why,
        action,
        steps,
        events,
        detectedAt: this.now(),
      });
    };
    if (event.input > t.input)
      add(
        "input",
        "High",
        `${format(event.input)} input tokens`,
        `> ${format(t.input)} input tokens`,
      );
    if (event.output > t.output)
      add(
        "output",
        "Medium",
        `${format(event.output)} output tokens`,
        `> ${format(t.output)} output tokens`,
      );
    if (event.latency > t.latency)
      add(
        "latency",
        "High",
        `${format(event.latency)} ms inference latency`,
        `> ${format(t.latency)} ms`,
      );
    const cost = estimateCost(event, this.pricing);
    if (
      event.task?.toLowerCase() === "classification" &&
      cost !== null &&
      cost > t.cost
    )
      add(
        "cost",
        "Medium",
        `${money(cost)} estimated for a classification request`,
        `> ${money(t.cost)} per classification request`,
      );
    let evaluatedCacheId: string | undefined;
    if (event.fingerprint) {
      const key = JSON.stringify([scope(event), event.fingerprint]);
      const group = this.prefixes.get(key) ?? {
        events: [],
        input: 0,
        cached: 0,
      };
      if (event.input > 0) {
        group.events.push(event);
        group.input += event.input;
        group.cached += event.cached;
        this.prefixes.set(key, group);
      }
      if (group.events.length >= minimumCacheSamples) {
        evaluatedCacheId = JSON.stringify(["cache", key]);
        const ratio = (group.cached / group.input) * 100;
        if (ratio < t.cache)
          add(
            "cache",
            "Medium",
            `${format(ratio)}% cached across ${group.events.length} requests (${format(group.cached)} of ${format(group.input)} input tokens)`,
            `< ${t.cache}% across at least ${minimumCacheSamples} matching requests`,
            [...group.events],
            key,
          );
      }
    }
    return { findings, evaluatedCacheId };
  }
}
export function diagnose(
  events: UsageEvent[],
  thresholds: Thresholds,
  pricing: ModelPricing[],
) {
  const engine = new DiagnosisEngine(thresholds, pricing);
  const findings = new Map<string, Diagnosis>();
  let cacheEvaluated = false;
  for (const event of events) {
    const result = engine.process(event);
    if (result.evaluatedCacheId) {
      findings.delete(result.evaluatedCacheId);
      cacheEvaluated = true;
    }
    for (const finding of result.findings) findings.set(finding.id, finding);
  }
  return { findings: [...findings.values()].reverse(), cacheEvaluated };
}
