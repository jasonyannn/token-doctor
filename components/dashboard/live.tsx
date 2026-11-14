"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { DiagnosisEngine } from "../../lib/diagnostics";
import { format, percentile, summarize } from "../../lib/analytics";
import { scenarios, simulate } from "../../lib/simulation";
import type { Diagnosis, Settings, UsageEvent } from "../../types";
import { Button } from "../ui/button";
import { EventTable } from "./views";

type Mode = "Idle" | "Running" | "Paused" | "Stopped";
export function Live({ settings }: { settings: Settings }) {
  const [mode, setMode] = useState<Mode>("Idle"),
    [scenario, setScenario] = useState(0);
  const [events, setEvents] = useState<UsageEvent[]>([]),
    [samples, setSamples] = useState<number[]>([]);
  const [findings, setFindings] = useState<Diagnosis[]>([]);
  const measurements = useRef<number[]>([]);
  const records = useRef<UsageEvent[]>([]);
  const next = useRef(0);
  const engine = useRef<DiagnosisEngine | null>(null);
  useEffect(() => {
    const current = new DiagnosisEngine(settings.thresholds, settings.pricing);
    const results = new Map<string, Diagnosis>();
    for (const event of records.current) {
      const result = current.process(event);
      if (result.evaluatedCacheId) results.delete(result.evaluatedCacheId);
      for (const finding of result.findings) results.set(finding.id, finding);
    }
    engine.current = current;
    setFindings([...results.values()]);
    measurements.current = [];
    setSamples([]);
  }, [settings.thresholds, settings.pricing]);
  useEffect(() => {
    if (mode !== "Running") return;
    const timer = setInterval(() => {
      const event = simulate(next.current++, scenario, true);
      const started = performance.now();
      const result = engine.current!.process(event);
      measurements.current = [
        ...measurements.current.slice(-199),
        performance.now() - started,
      ];
      records.current = [...records.current, event];
      setEvents(records.current);
      setSamples(measurements.current);
      setFindings((previous) => [
        ...previous.filter((f) => f.id !== result.evaluatedCacheId),
        ...result.findings,
      ]);
    }, 650);
    return () => clearInterval(timer);
  }, [mode, scenario]);
  const total = summarize(events, settings.pricing);
  const reset = () => {
    setMode("Idle");
    records.current = [];
    measurements.current = [];
    next.current = 0;
    engine.current = new DiagnosisEngine(settings.thresholds, settings.pricing);
    setEvents([]);
    setSamples([]);
    setFindings([]);
  };
  return (
    <div className="stack">
      <section className="panel padded">
        <div className="section-header">
          <div>
            <h2>Local simulator</h2>
            <p>Synthetic requests arrive every 650 ms while running.</p>
          </div>
          <span className="badge">{mode}</span>
        </div>
        <label>
          Scenario
          <select
            value={scenario}
            onChange={(e) => setScenario(Number(e.target.value))}
          >
            {scenarios.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="actions">
          <Button
            variant="primary"
            disabled={mode === "Running"}
            onClick={() => setMode("Running")}
          >
            <Play size={15} />
            {mode === "Paused" ? "Resume" : "Start"}
          </Button>
          <Button
            disabled={mode !== "Running"}
            onClick={() => setMode("Paused")}
          >
            <Pause size={15} /> Pause
          </Button>
          <Button
            disabled={mode !== "Running" && mode !== "Paused"}
            onClick={() => setMode("Stopped")}
          >
            <Square size={15} /> Stop
          </Button>
          <Button onClick={reset}>
            <RotateCcw size={15} /> Reset
          </Button>
        </div>
      </section>
      <div className="metrics">
        {[
          ["Events", events.length],
          ["Total tokens", format(total.tokens)],
          ["Active findings", findings.length],
          [
            "Average simulated inference",
            events.length ? format(total.latency) + " ms" : "—",
          ],
          [
            "Local processing p50",
            samples.length ? percentile(samples, 0.5).toFixed(3) + " ms" : "—",
          ],
          [
            "Local processing p95",
            samples.length ? percentile(samples, 0.95).toFixed(3) + " ms" : "—",
          ],
        ].map(([label, value]) => (
          <section className="panel metric" key={label}>
            <h2>{label}</h2>
            <strong>{value}</strong>
          </section>
        ))}
      </div>
      <section className="panel padded">
        <h2>Incoming events</h2>
        <p>
          Showing up to 40 recent events. Local processing percentiles use up to
          200 measured events with the current configuration. Target below 100
          ms. End-to-end latency requires real telemetry.
        </p>
        <EventTable
          events={events.slice(-40).reverse()}
          pricing={settings.pricing}
        />
      </section>
      <section className="panel padded">
        <h2>Latest live findings</h2>
        {findings.length ? (
          findings
            .slice(-5)
            .reverse()
            .map((f) => (
              <details key={f.id}>
                <summary>
                  {f.title} · {f.evidence}
                </summary>
                <p>
                  {f.threshold} · {f.detectedAt}
                </p>
                <p>
                  {f.why} {f.action}
                </p>
                <EventTable events={f.events} pricing={settings.pricing} />
              </details>
            ))
        ) : (
          <p>
            Waiting for evidence. A cache finding requires at least three
            matching requests.
          </p>
        )}
      </section>
    </div>
  );
}
