import Papa from "papaparse";
import type { UsageEvent } from "../types";

export function parseUsage(text: string, name: string): UsageEvent[] {
  const csv = name.toLowerCase().endsWith(".csv");
  const parsed = csv
    ? Papa.parse(text, { header: true, skipEmptyLines: "greedy" })
    : null;
  if (parsed?.errors.length) throw new Error(parsed.errors[0].message);
  const rows: unknown = parsed ? parsed.data : JSON.parse(text);
  if (!Array.isArray(rows) || !rows.length)
    throw new Error("Include at least one usage record.");
  const ids = new Set<string>();
  return rows.map((row, index) => {
    const fail = (field: string): never => {
      throw new Error(`Record ${index + 1}: invalid ${field}.`);
    };
    if (!row || typeof row !== "object") fail("record");
    const required = (field: string) =>
      typeof row[field] === "string" && row[field].trim()
        ? row[field].trim()
        : fail(field);
    const optional = (field: string) =>
      row[field] == null || row[field] === "" ? undefined : required(field);
    const number = (field: string) => {
      const raw = row[field];
      const value =
        csv && typeof raw === "string" && raw.trim() ? Number(raw) : raw;
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        (field !== "latency" && !Number.isSafeInteger(value))
      )
        fail(field);
      return value as number;
    };
    const timestamp = new Date(required("timestamp"));
    if (!Number.isFinite(timestamp.getTime())) fail("timestamp");
    const id = optional("id") ?? `import-${index + 1}`;
    if (ids.has(id)) fail("duplicate id");
    ids.add(id);
    const input = number("input"),
      output = number("output"),
      cached = number("cached");
    if (cached > input) fail("cached (must be at most input)");
    if (![undefined, "", true, false, "true", "false"].includes(row.simulated))
      fail("simulated");
    return {
      id,
      timestamp: timestamp.toISOString(),
      provider: required("provider"),
      model: required("model"),
      application: required("application"),
      department: optional("department"),
      fingerprint: optional("fingerprint"),
      task: optional("task"),
      input,
      output,
      cached,
      latency: number("latency"),
      simulated: row.simulated === true || row.simulated === "true",
    };
  });
}
