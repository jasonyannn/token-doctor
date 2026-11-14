"use client";
import { useState } from "react";
import { Download, RefreshCw, Upload } from "lucide-react";
import type { Settings, UsageEvent } from "../../types";
import { demo } from "../../lib/simulation";
import { parseUsage } from "../../lib/telemetry";
import { fields, GoalFields, ProfileField } from "../onboarding";
import { Button } from "../ui/button";

export function ImportPanel({
  onImport,
}: {
  onImport: (events: UsageEvent[]) => void;
}) {
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");

  const syncPromptLab = async () => {
    setError("");
    setNotice("");
    setSyncing(true);
    try {
      const response = await fetch("/api/prompt-lab?days=30", {
        cache: "no-store",
      });
      const body = (await response.json().catch(() => ({}))) as {
        events?: unknown[];
        skipped?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error || "Prompt Lab sync failed.");
      if (!body.events?.length) {
        setNotice(
          "Connected to Prompt Lab, but it has no calls with token counts in the last 30 days. Use an AI feature in Prompt Lab, then sync again.",
        );
        return;
      }
      // Same validator as a file upload, so synced data obeys the import contract.
      const events = parseUsage(JSON.stringify(body.events), "prompt-lab.json");
      onImport(events);
      setNotice(
        `Imported ${events.length} Prompt Lab calls from the last 30 days` +
          (body.skipped ? ` (${body.skipped} without token counts left out).` : "."),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Prompt Lab sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="import-panel">
      <p>
        Upload a JSON array or CSV with timestamp, provider, model, application,
        input, output, cached and latency (ms). Optional fields include id,
        department, fingerprint, task and simulated.
      </p>
      <Button type="button" onClick={syncPromptLab} disabled={syncing}>
        <RefreshCw size={16} /> {syncing ? "Syncing…" : "Sync from Prompt Lab"}
      </Button>
      <label>
        <Upload size={16} /> Usage file
        <input
          type="file"
          accept=".json,.csv"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError("");
            try {
              if (!/\.(json|csv)$/i.test(file.name))
                throw new Error("Choose a JSON or CSV file.");
              onImport(parseUsage(await file.text(), file.name));
            } catch (error) {
              setError(
                error instanceof Error ? error.message : "Import failed.",
              );
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <Button asChild>
        <a
          download="token-doctor-example.json"
          href={
            "data:application/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(demo, null, 2))
          }
        >
          <Download size={16} /> Download example
        </a>
      </Button>
    </div>
  );
}
const thresholdFields = {
  input: "Input tokens per request",
  output: "Output tokens per request",
  cache: "Minimum cache reuse (%)",
  cost: "Classification cost per request (USD)",
  latency: "Inference latency (ms)",
};
export function SettingsView({
  settings,
  update,
  onImport,
  onDemo,
  onClearDemo,
  onTour,
}: {
  settings: Settings;
  update: (s: Settings) => void;
  onImport: (e: UsageEvent[]) => void;
  onDemo: () => void;
  onClearDemo?: () => void;
  onTour: () => void;
}) {
  return (
    <div className="stack">
      <section className="panel padded">
        <h2>Profile and preferences</h2>
        <div className="form-grid">
          {(Object.keys(fields) as (keyof typeof fields)[]).map((name) => (
            <ProfileField key={name} {...{ name, settings, update }} />
          ))}
          <label>
            Theme
            <select
              value={settings.theme}
              onChange={(e) =>
                update({
                  ...settings,
                  theme: e.target.value === "dark" ? "dark" : "light",
                })
              }
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>
        <GoalFields {...{ settings, update }} />
      </section>
      <section className="panel padded">
        <h2>Diagnosis thresholds</h2>
        <div className="form-grid">
          {(
            Object.keys(thresholdFields) as (keyof typeof thresholdFields)[]
          ).map((key) => (
            <label key={key}>
              {thresholdFields[key]}
              <input
                type="number"
                min="0"
                max={key === "cache" ? 100 : undefined}
                step="any"
                key={key + settings.thresholds[key]}
                defaultValue={settings.thresholds[key]}
                onBlur={(e) => {
                  const value = e.target.valueAsNumber;
                  if (!e.target.validity.valid || !Number.isFinite(value)) {
                    e.target.value = String(settings.thresholds[key]);
                    return;
                  }
                  if (value !== settings.thresholds[key])
                    update({
                      ...settings,
                      thresholds: { ...settings.thresholds, [key]: value },
                    });
                }}
              />
            </label>
          ))}
        </div>
        <p>Threshold edits apply when you leave the field.</p>
      </section>
      <PricingEditor
        key={JSON.stringify(settings.pricing)}
        rates={settings.pricing}
        update={(pricing) => update({ ...settings, pricing })}
      />
      <section className="panel padded">
        <h2>Data import</h2>
        <ImportPanel onImport={onImport} />
      </section>
      <section className="panel padded">
        <h2>Demo and guided tour</h2>
        <p>
          You can try simulated usage and clear it to return to your imported
          data.
        </p>
        <div className="actions">
          <Button onClick={onDemo}>
            {onClearDemo ? "Reset demo" : "Load demo data"}
          </Button>
          {onClearDemo && (
            <Button onClick={onClearDemo}>Clear demo data</Button>
          )}
          <Button onClick={onTour}>Restart guided tour</Button>
        </div>
      </section>
    </div>
  );
}
function PricingEditor({
  rates,
  update,
}: {
  rates: Settings["pricing"];
  update: (pricing: Settings["pricing"]) => void;
}) {
  const [draft, setDraft] = useState(
    rates.map((rate) => ({
      ...rate,
      input: String(rate.input),
      cached: String(rate.cached),
      output: String(rate.output),
    })),
  );
  const [error, setError] = useState("");
  return (
    <form
      className="panel padded"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = draft.map((rate) => ({
          ...rate,
          provider: rate.provider.trim(),
          model: rate.model.trim(),
          input: Number(rate.input),
          cached: Number(rate.cached),
          output: Number(rate.output),
        }));
        if (
          parsed.some(
            (rate) =>
              !rate.provider ||
              !rate.model ||
              ![rate.input, rate.cached, rate.output].every(Number.isFinite) ||
              rate.cached > rate.input,
          )
        ) {
          setError(
            "Enter a provider and model, and keep cached input pricing at or below input pricing.",
          );
          return;
        }
        if (
          new Set(
            parsed.map((rate) => JSON.stringify([rate.provider, rate.model])),
          ).size !== parsed.length
        ) {
          setError("Each provider and model pair needs a single rate.");
          return;
        }
        setError("");
        update(parsed);
      }}
    >
      <h2>Example model pricing</h2>
      <p>
        Editable USD per million tokens. The example prices are assumptions.
        Match provider and model names to your usage data.
      </p>
      {draft.map((rate, index) => (
        <div key={index} className="pricing-row">
          {(["provider", "model", "input", "cached", "output"] as const).map(
            (field) => (
              <label key={field}>
                {
                  {
                    provider: "Provider",
                    model: "Model",
                    input: "Input",
                    cached: "Cached input",
                    output: "Output",
                  }[field]
                }
                <input
                  required
                  type={
                    field === "provider" || field === "model"
                      ? "text"
                      : "number"
                  }
                  min="0"
                  step="any"
                  value={rate[field]}
                  onChange={(e) =>
                    setDraft((rows) =>
                      rows.map((row, i) =>
                        i === index ? { ...row, [field]: e.target.value } : row,
                      ),
                    )
                  }
                />
              </label>
            ),
          )}
        </div>
      ))}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="actions">
        <Button
          type="button"
          onClick={() =>
            setDraft((rows) => [
              ...rows,
              { provider: "", model: "", input: "0", cached: "0", output: "0" },
            ])
          }
        >
          Add model rate
        </Button>
        <Button variant="primary">Save pricing</Button>
      </div>
    </form>
  );
}
