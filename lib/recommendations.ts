import type { Diagnosis, ReviewStatus } from "../types";

export const reviewStatuses: ReviewStatus[] = [
  "For review",
  "In progress",
  "Completed",
];

export function recommendations(findings: Diagnosis[]) {
  const groups = new Map<string, Diagnosis[]>();
  for (const finding of findings) {
    const event = finding.events[0];
    const id = JSON.stringify([
      finding.kind,
      event.provider,
      event.model,
      event.application,
    ]);
    const group = groups.get(id) ?? [];
    group.push(finding);
    groups.set(id, group);
  }
  return [...groups].map(([id, evidence]) => ({
    id,
    evidence,
    primary: evidence[0],
    requests: new Set(
      evidence.flatMap((finding) => finding.events.map((event) => event.id)),
    ).size,
  }));
}
