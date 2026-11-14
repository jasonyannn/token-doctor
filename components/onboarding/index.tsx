"use client";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  FileUp,
  ClipboardList,
  Play,
  ScanLine,
  Zap,
} from "lucide-react";
import type { Settings } from "../../types";
import { BrandLogo, MascotAssistant } from "../brand";
import { Button } from "../ui/button";

export const fields = {
  role: [
    "Developer / AI Engineer",
    "Founder / Business Owner",
    "Product Manager / Operations",
    "Student / Researcher",
    "Finance / Leadership",
    "Exploring AI",
    "Other",
  ],
  familiarity: ["Beginner", "Some experience", "Experienced", "Advanced"],
  industry: [
    "Technology",
    "Finance",
    "Healthcare",
    "Education",
    "Retail",
    "Marketing",
    "Professional Services",
    "Other",
  ],
  size: [
    "Just me",
    "2–10",
    "11–50",
    "51–200",
    "201–1,000",
    "1,000+",
    "Not applicable",
  ],
  discovery: [
    "Google",
    "ChatGPT / AI assistant",
    "LinkedIn",
    "Instagram / TikTok",
    "Reddit",
    "YouTube",
    "Friend / Colleague",
    "Event / Hackathon",
    "University",
    "Other",
    "Prefer not to say",
  ],
};
export const goals = [
  "Reduce AI token costs",
  "Improve AI response speed",
  "Understand token consumption",
  "Find unnecessary token usage",
  "Compare model efficiency",
  "Learn how AI tokens work",
];
export const questions = {
  role: "What best describes you?",
  familiarity: "How familiar are you with AI?",
  industry: "Which industry are you working in?",
  size: "How large is your organisation?",
  discovery: "How did you hear about Token Doctor?",
};
export function ProfileField({
  name,
  settings,
  update,
}: {
  name: keyof typeof fields;
  settings: Settings;
  update: (settings: Settings) => void;
}) {
  return (
    <label>
      {questions[name]}
      <select
        value={settings.profile[name] ?? ""}
        onChange={(e) =>
          update({
            ...settings,
            profile: { ...settings.profile, [name]: e.target.value },
          })
        }
      >
        <option value="">Select an option</option>
        {fields[name].map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </label>
  );
}
export function GoalFields({
  settings,
  update,
}: {
  settings: Settings;
  update: (settings: Settings) => void;
}) {
  return (
    <fieldset className="goals">
      <legend>What would you like Token Doctor to help you with?</legend>
      {goals.map((goal) => (
        <label key={goal}>
          <input
            type="checkbox"
            checked={settings.goals.includes(goal)}
            onChange={(e) =>
              update({
                ...settings,
                goals: e.target.checked
                  ? [...settings.goals, goal]
                  : settings.goals.filter((value) => value !== goal),
              })
            }
          />
          {goal}
        </label>
      ))}
    </fieldset>
  );
}
export function Onboarding({
  settings,
  update,
  demo,
  importPanel,
  step,
  setStep,
  returnToWorkspace,
}: {
  settings: Settings;
  update: (settings: Settings) => void;
  demo: (destination?: number) => void;
  step: number;
  setStep: (step: number) => void;
  returnToWorkspace?: () => void;
  importPanel: React.ReactNode;
}) {
  return (
    <main className="welcome">
      <header>
        <BrandLogo />
        {returnToWorkspace ? (
          <Button onClick={returnToWorkspace}>
            Return to workspace <ArrowRight size={15} />
          </Button>
        ) : (
          step > 0 && (
            <Button onClick={() => demo()}>
              <Play size={14} /> Explore demo
            </Button>
          )
        )}
      </header>
      {step === 0 ? (
        <>
          <div className="welcome-grid">
            <section className="welcome-copy">
              <div className="eyebrow">
                <Activity size={16} /> AI TOKEN EFFICIENCY INTELLIGENCE
              </div>
              <h1>Token Doctor here! Ready to diagnose your tokens</h1>
              <p className="slogan">
                Diagnose wasted tokens. Accelerate AI workflows. Reduce
                inference costs.
              </p>
              <p>
                I&apos;ll help you understand where your AI tokens are going,
                identify inefficiencies and find ways to make your AI usage
                faster and more cost-effective.
              </p>
              <div className="actions">
                <Button variant="primary" onClick={() => setStep(1)}>
                  Get started <ArrowRight size={17} />
                </Button>
                <Button onClick={() => demo()}>
                  <Play size={15} /> Explore demo
                </Button>
                <Button onClick={() => setStep(5)}>
                  <FileUp size={16} /> Upload usage data
                </Button>
              </div>
            </section>
            <div className="welcome-art">
              <div className="art-grid" />
              <span className="art-icon one">
                <ScanLine size={24} />
              </span>
              <span className="art-icon two">
                <Zap size={22} />
              </span>
              <MascotAssistant size={360} />
            </div>
          </div>
          <section
            className="welcome-features"
            aria-labelledby="feature-heading"
          >
            <h2 id="feature-heading">What can Token Doctor help you do?</h2>
            <div className="welcome-feature-grid">
              {[
                {
                  icon: ScanLine,
                  title: "Find token inefficiencies",
                  description:
                    "Inspect the requests and thresholds behind token, cache, cost and latency findings.",
                  cta: "Investigate demo findings",
                  destination: 2,
                },
                {
                  icon: Activity,
                  title: "Watch usage arrive live",
                  description:
                    "Run simulated requests and see how long the local diagnosis engine takes to evaluate them.",
                  cta: "Open live simulator",
                  destination: 1,
                },
                {
                  icon: ClipboardList,
                  title: "Plan an efficiency improvement",
                  description:
                    "Review suggested changes, check the evidence and track what you decide to implement.",
                  cta: "Review demo recommendations",
                  destination: 3,
                },
              ].map(({ icon: Icon, title, description, cta, destination }) => (
                <article key={title} className="panel welcome-feature">
                  <span className="metric-icon">
                    <Icon size={18} />
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <Button onClick={() => demo(destination)}>
                    {cta} <ArrowRight size={15} />
                  </Button>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="panel onboarding">
          <div className="step-bar" aria-label={`Step ${step + 1} of 6`}>
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className={i <= step ? "active" : ""} />
            ))}
          </div>
          <MascotAssistant />
          <h1>
            {
              [
                "",
                "About you",
                "Organisation",
                "Goals",
                "Discovery",
                "Start analysing",
              ][step]
            }
          </h1>
          {step === 1 && (
            <>
              <ProfileField name="role" {...{ settings, update }} />
              <ProfileField name="familiarity" {...{ settings, update }} />
            </>
          )}
          {step === 2 && (
            <>
              <ProfileField name="industry" {...{ settings, update }} />
              <ProfileField name="size" {...{ settings, update }} />
            </>
          )}
          {step === 3 && <GoalFields {...{ settings, update }} />}
          {step === 4 && (
            <ProfileField name="discovery" {...{ settings, update }} />
          )}
          {step === 5 && (
            <>
              <Button variant="primary" onClick={() => demo()}>
                <Play size={16} /> Explore demo data
              </Button>
              <h2>
                <FileUp size={18} /> Upload usage data
              </h2>
              {importPanel}
            </>
          )}
          <div className="actions">
            <Button onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} /> Back
            </Button>
            {step < 5 && (
              <Button variant="primary" onClick={() => setStep(step + 1)}>
                Continue <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
