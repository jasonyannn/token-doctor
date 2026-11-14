export interface UsageEvent {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  application: string;
  department?: string;
  fingerprint?: string;
  task?: string;
  input: number;
  output: number;
  cached: number;
  latency: number;
  simulated: boolean;
}
export interface ModelPricing {
  provider: string;
  model: string;
  input: number;
  cached: number;
  output: number;
}
export interface Thresholds {
  input: number;
  output: number;
  cache: number;
  cost: number;
  latency: number;
}
export type FindingKind = keyof Thresholds;
export interface Diagnosis {
  id: string;
  kind: FindingKind;
  title: string;
  severity: "High" | "Medium";
  evidence: string;
  threshold: string;
  why: string;
  action: string;
  steps: string;
  events: UsageEvent[];
  detectedAt: string;
}
export type ReviewStatus = "For review" | "In progress" | "Completed";
export interface Settings {
  profile: Record<string, string>;
  goals: string[];
  theme: "light" | "dark";
  pricing: ModelPricing[];
  thresholds: Thresholds;
}
