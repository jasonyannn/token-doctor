import { describe, expect, it } from "vitest";
import { breakdown, percentile, summarize } from "../lib/analytics";
import { defaults, diagnose, DiagnosisEngine } from "../lib/diagnostics";
import { defaultPricing, estimateCost } from "../lib/pricing";
import { recommendations } from "../lib/recommendations";
import { demo, simulate } from "../lib/simulation";
import { parseUsage } from "../lib/telemetry";

describe("telemetry", () => {
  it("round trips the example and ignores raw prompts", () => {
    const event = { ...demo[0], prompt: "private" };
    expect(parseUsage(JSON.stringify([event]), "example.json")).toEqual([
      demo[0],
    ]);
  });
  it("reads quoted CSV and optional columns", () => {
    const [event] = parseUsage(
      'timestamp,provider,model,application,input,output,cached,latency\n2026-11-01T00:00:00Z,OpenAI,Standard,"Research, APAC",100,20,10,2.5',
      "usage.csv",
    );
    expect(event).toMatchObject({
      input: 100,
      cached: 10,
      latency: 2.5,
      application: "Research, APAC",
      simulated: false,
    });
  });
  it("rejects invalid data and duplicate IDs", () => {
    expect(() =>
      parseUsage(JSON.stringify([{ ...demo[0], cached: 1e9 }]), "invalid.json"),
    ).toThrow(/cached/);
    expect(() =>
      parseUsage(JSON.stringify([demo[0], demo[0]]), "invalid.json"),
    ).toThrow(/duplicate/);
    expect(() =>
      parseUsage(
        JSON.stringify([{ ...demo[0], timestamp: "missing" }]),
        "invalid.json",
      ),
    ).toThrow(/timestamp/);
    expect(() =>
      parseUsage(
        "timestamp,provider,model,application,input,output,cached,latency\n2026-11-01,OpenAI,Standard,Research,,20,10,4",
        "usage.csv",
      ),
    ).toThrow(/input/);
  });
});
describe("analytics", () => {
  it("prices cached tokens without double charging and records unpriced events", () => {
    const event = { ...demo[0], input: 100, cached: 20, output: 10 };
    const pricing = [
      {
        provider: event.provider,
        model: event.model,
        input: 10,
        cached: 2,
        output: 30,
      },
    ];
    expect(estimateCost(event, pricing)).toBeCloseTo(0.00114, 10);
    expect(estimateCost({ ...event, model: "Unknown" }, pricing)).toBeNull();
    expect(summarize([event], pricing)).toMatchObject({
      tokens: 110,
      cached: 20,
      unpriced: 0,
      requests: 1,
    });
  });
  it("groups missing dimensions and measures percentiles", () => {
    expect(
      breakdown(
        [{ ...demo[0], department: undefined }],
        (e) => e.department ?? "Not provided",
        defaultPricing,
      )[0].name,
    ).toBe("Not provided");
    expect(percentile([5, 2, 1, 4, 3], 0.5)).toBe(3);
    expect(percentile([5, 2, 1, 4, 3], 0.95)).toBe(5);
  });
});
describe("diagnostics", () => {
  it("derives all five rules and links recommendations to evidence", () => {
    const { findings } = diagnose(demo, defaults, defaultPricing);
    expect(new Set(findings.map((f) => f.kind))).toEqual(
      new Set(["input", "output", "cache", "cost", "latency"]),
    );
    for (const finding of findings) {
      expect(finding.events.every((event) => demo.includes(event))).toBe(true);
      expect(finding.threshold).toBeTruthy();
    }
    expect(recommendations(findings).flatMap((r) => r.evidence)).toEqual(
      expect.arrayContaining(findings),
    );
  });
  it("requires three cache samples in scope and refreshes group evidence", () => {
    const engine = new DiagnosisEngine(defaults, defaultPricing);
    const first = simulate(0, 3, true);
    expect(engine.process(first)).toEqual({
      findings: [],
      evaluatedCacheId: undefined,
    });
    engine.process({ ...first, id: "other", application: "Different" });
    expect(engine.process(simulate(1, 3, true)).findings).toEqual([]);
    expect(
      engine.process(simulate(2, 3, true)).findings[0].events,
    ).toHaveLength(3);
    expect(
      engine.process(simulate(3, 3, true)).findings[0].events,
    ).toHaveLength(4);
    expect(
      engine
        .process({ ...first, id: "improved", input: 100000, cached: 100000 })
        .findings.some((f) => f.kind === "cache"),
    ).toBe(false);
  });
  it("honors thresholds and omits cost recommendations without the relevant task or rate", () => {
    const high = simulate(0, 4, true);
    expect(
      diagnose([high], defaults, defaultPricing).findings.some(
        (f) => f.kind === "cost",
      ),
    ).toBe(true);
    expect(
      diagnose([{ ...high, task: undefined }], defaults, defaultPricing)
        .findings,
    ).toEqual([]);
    expect(diagnose([high], defaults, []).findings).toEqual([]);
    expect(
      diagnose([high], { ...defaults, cost: 100 }, defaultPricing).findings,
    ).toEqual([]);
  });
});
