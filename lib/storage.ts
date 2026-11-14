import { defaults } from "./diagnostics";
import { demo } from "./simulation";
import { defaultPricing } from "./pricing";
import type { ReviewStatus, Settings, UsageEvent } from "../types";

export interface Session {
  organisations?: Organisation[];
  activeProjectId?: string;
  settings: Settings;
  source: "demo" | "import" | null;
  events: UsageEvent[];
  statuses: Record<string, ReviewStatus>;
}
export const initialSession: Session = {
  source: null,
  events: [],
  statuses: {},
  settings: {
    profile: {},
    goals: [],
    theme: "light",
    pricing: defaultPricing,
    thresholds: defaults,
  },
};
const key = "token-doctor-v1";
export function loadSession(): Session {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return initialSession;
    const session: Session = JSON.parse(saved);
    const pricing = [...session.settings.pricing];
    for (const [index, legacy] of [
      "Standard",
      "Premium",
      "Flash",
      "",
    ].entries()) {
      const current = defaultPricing[index];
      if (
        pricing.some(
          (rate) =>
            rate.provider === current.provider && rate.model === current.model,
        )
      )
        continue;
      const previous = pricing.find(
        (rate) => rate.provider === current.provider && rate.model === legacy,
      );
      pricing.push(previous ? { ...previous, model: current.model } : current);
    }
    if (session.source === "demo") {
      const oldEvents = new Map(
        session.events.map((event) => [event.id, event]),
      );
      for (const event of demo) {
        const old = oldEvents.get(event.id);
        if (!old) continue;
        for (const kind of Object.keys(defaults)) {
          const oldKey = JSON.stringify([
            kind,
            old.provider,
            old.model,
            old.application,
          ]);
          const newKey = JSON.stringify([
            kind,
            event.provider,
            event.model,
            event.application,
          ]);
          if (session.statuses[oldKey] && !session.statuses[newKey]) {
            session.statuses[newKey] = session.statuses[oldKey];
          }
        }
      }
      session.events = demo;
    }
    session.settings.pricing = pricing;
    return session;
  } catch {
    return initialSession;
  }
}
export function saveSession(session: Session) {
  try {
    localStorage.setItem(key, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export type ProjectData = Pick<Session, "source" | "events" | "statuses">;
export interface Project extends ProjectData {
  id: string;
  name: string;
  importedData?: Pick<ProjectData, "events" | "statuses">;
}
export interface Organisation {
  id: string;
  name: string;
  projects: Project[];
}
export function defaultOrganisation(data: ProjectData): Organisation {
  return {
    id: "default-organisation",
    name: data.source === "import" ? "My organisation" : "Demo AI Co.",
    projects: [
      {
        id: "default-project",
        name: data.source === "import" ? "Imported dataset" : "Demo project",
        source: data.source ?? "demo",
        events: data.source ? data.events : demo,
        statuses: data.statuses,
      },
    ],
  };
}
