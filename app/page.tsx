"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  ScanLine,
  Settings as Gear,
} from "lucide-react";
import { Projects } from "../components/projects";
import { TestAccount, loadAccount } from "../components/account";
import { Assistant } from "../components/assistant";
import { BrandLogo, MascotAssistant } from "../components/brand";
import {
  Breakdown,
  Findings,
  Overview,
  Recommendations,
} from "../components/dashboard/views";
import { Live } from "../components/dashboard/live";
import { SettingsView } from "../components/dashboard/settings";
import { Onboarding } from "../components/onboarding";
import { Button } from "../components/ui/button";
import { diagnose } from "../lib/diagnostics";
import { demo } from "../lib/simulation";
import {
  defaultOrganisation,
  initialSession,
  loadSession,
  saveSession,
  type Project,
  type ProjectData,
} from "../lib/storage";
import type { ReviewStatus, Settings, UsageEvent } from "../types";

const nav = [
  [
    "Overview",
    LayoutDashboard,
    "Monitor token volume, estimated spend and inference latency.",
  ],
  [
    "Live Token Usage",
    Activity,
    "Watch simulated requests pass through the local diagnosis engine.",
  ],
  [
    "Token Diagnosis",
    ScanLine,
    "Inspect affected requests, thresholds and supporting evidence.",
  ],
  [
    "Recommendations",
    ClipboardList,
    "Review suggested changes and track implementation.",
  ],
  [
    "Usage Breakdown",
    BarChart3,
    "Find where your tokens and estimated spend are concentrated.",
  ],
  ["Settings", Gear, "Manage your profile, pricing, thresholds and data."],
] as const;
const modelName = (e: UsageEvent) => e.provider + " / " + e.model;
const blankFilters = {
  provider: "",
  model: "",
  application: "",
  from: "",
  to: "",
};

export default function App() {
  const [session, setSession] = useState(initialSession),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const [page, setPage] = useState(0),
    [collapsed, setCollapsed] = useState(false),
    [filters, setFilters] = useState(blankFilters);
  const [account, setAccount] = useState("");
  const [accountRequest, requestAccount] = useState(0);
  const [destination, setDestination] = useState(0);
  const openAccount = (page = 0) => {
    setDestination(page);
    requestAccount((count) => count + 1);
  };
  const [tour, setTour] = useState(-1),
    [liveKey, setLiveKey] = useState(0);
  useEffect(() => {
    const saved = loadSession();
    const active = loadAccount();
    setAccount(active);
    setSession({
      ...saved,
      organisations: saved.organisations ?? [defaultOrganisation(saved)],
    });
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) setFailed(!saveSession(session));
  }, [ready, session]);
  const settings = session.settings;
  const update = (settings: Settings) =>
    setSession((s) => ({ ...s, settings }));
  const organisations = session.organisations ?? [];
  const organisation =
    organisations.find((item) =>
      item.projects.some((project) => project.id === session.activeProjectId),
    ) ?? organisations[0];
  const project =
    organisation?.projects.find(
      (item) => item.id === session.activeProjectId,
    ) ?? organisation?.projects[0];
  const data = project ?? initialSession;
  const changeProject = (
    change: (
      current: Project,
    ) => ProjectData & Partial<Pick<Project, "name" | "importedData">>,
  ) => {
    const target = project?.id;
    setSession((current) => ({
      ...current,
      organisations: current.organisations?.map((group) =>
        group.projects.some((item) => item.id === target)
          ? {
              ...group,
              projects: group.projects.map((item) =>
                item.id === target ? { ...item, ...change(item) } : item,
              ),
            }
          : group,
      ),
    }));
  };
  const selectProject = (id: string) => {
    setSession((current) => ({ ...current, activeProjectId: id }));
    setFilters(blankFilters);
    setPage(0);
    setTour(-1);
    setLiveKey((key) => key + 1);
  };
  const saveProject = (
    action: "New organisation" | "New project" | "Rename project",
    name: string,
    firstProject: string,
  ) => {
    if (action === "Rename project") {
      changeProject((item) => ({ ...item, name }));
      return;
    }
    const created: Project = {
      id: crypto.randomUUID(),
      name: action === "New organisation" ? firstProject : name,
      source: null,
      events: [],
      statuses: {},
    };
    const groupId = crypto.randomUUID();
    setSession((current) => ({
      ...current,
      organisations:
        action === "New organisation"
          ? [
              ...(current.organisations ?? []),
              { id: groupId, name, projects: [created] },
            ]
          : current.organisations?.map((group) =>
              group.id === organisation.id
                ? { ...group, projects: [...group.projects, created] }
                : group,
            ),
    }));
    selectProject(created.id);
  };
  const resetUsageView = () => {
    setFilters(blankFilters);
    setPage(0);
    setLiveKey((key) => key + 1);
  };
  const onDemo = () => {
    changeProject((current) => ({
      source: "demo",
      events: demo,
      statuses: {},
      importedData:
        current.source === "import"
          ? { events: current.events, statuses: current.statuses }
          : current.importedData,
    }));
    resetUsageView();
  };
  const onClearDemo = () => {
    changeProject((current) => {
      if (current.source !== "demo") return current;
      return {
        source: current.importedData ? "import" : null,
        events: current.importedData?.events ?? [],
        statuses: current.importedData?.statuses ?? {},
        importedData: undefined,
      };
    });
    resetUsageView();
  };
  const changeAccount = (email: string) => {
    setAccount(email);
    setTour(-1);
    if (email) {
      setPage(destination);
    }
    setDestination(0);
  };
  const onImport = (events: UsageEvent[]) => {
    changeProject(() => ({
      source: "import",
      events,
      statuses: {},
      importedData: undefined,
    }));
    resetUsageView();
  };
  const events = useMemo(
    () =>
      data.events.filter(
        (e) =>
          (!filters.provider || e.provider === filters.provider) &&
          (!filters.model || modelName(e) === filters.model) &&
          (!filters.application || e.application === filters.application) &&
          (!filters.from || e.timestamp.slice(0, 10) >= filters.from) &&
          (!filters.to || e.timestamp.slice(0, 10) <= filters.to),
      ),
    [data.events, filters],
  );
  const { findings, cacheEvaluated } = useMemo(
    () => diagnose(events, settings.thresholds, settings.pricing),
    [events, settings.thresholds, settings.pricing],
  );
  const updateStatus = (id: string, value: ReviewStatus | undefined) =>
    changeProject((s) => {
      const statuses = { ...s.statuses };
      if (value) statuses[id] = value;
      else delete statuses[id];
      return { ...s, statuses };
    });
  const runTour = () => {
    setTour(0);
    setPage(0);
  };
  if (!ready)
    return (
      <main className="loading">
        <BrandLogo />
      </main>
    );
  return (
    <div data-theme={settings.theme}>
      {failed && (
        <div className="storage-error" role="alert">
          Browser storage could not save these changes. Keep this tab open to
          retain the current data.
        </div>
      )}
      <div className="account-bar">
        <TestAccount
          account={account}
          setAccount={changeAccount}
          request={accountRequest}
        />
      </div>
      {!account && (
        <Onboarding
          settings={settings}
          update={update}
          demo={openAccount}
          step={0}
          setStep={(step) => openAccount(step === 5 ? 5 : 0)}
          importPanel={null}
        />
      )}
      {account && organisation && project && (
        <div className={`shell ${collapsed ? "collapsed" : ""}`}>
          <aside className="sidebar">
            <div className="sidebar-brand">
              <BrandLogo compact={collapsed} />
            </div>
            <nav aria-label="Workspace">
              {nav.map(([name, Icon], index) => (
                <button
                  key={name}
                  className={page === index ? "selected" : ""}
                  title={name}
                  aria-label={name}
                  aria-current={page === index ? "page" : undefined}
                  onClick={() => {
                    setPage(index);
                    setTour(-1);
                  }}
                >
                  <Icon size={19} />
                  <span>{name}</span>
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <button
                onClick={runTour}
                title="Guided tour"
                aria-label="Guided tour"
              >
                <CircleHelp size={19} />
                <span>Guided tour</span>
              </button>
              <button
                className="collapse-button"
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <ChevronRight size={18} />
                ) : (
                  <ChevronLeft size={18} />
                )}
                <span>Collapse</span>
              </button>
            </div>
          </aside>
          <main className="workspace">
            <header className="topbar">
              <Projects
                {...{ organisations, organisation, project }}
                select={selectProject}
                save={saveProject}
              />
              <span className="badge">
                <i />
                {data.source === "demo"
                  ? "Simulated data"
                  : data.events.some((e) => e.simulated)
                    ? "Includes simulated data"
                    : data.source === "import"
                      ? "Local data"
                      : "No usage data"}
              </span>
            </header>
            <div className="content">
              {data.source === "demo" && page === 0 && (
                <section className="panel callout project-empty">
                  <p>
                    {project.importedData
                      ? "Viewing demo data. Your imported usage is saved."
                      : "Viewing demo data. Clear it to start with an empty project."}
                  </p>
                  <Button onClick={onClearDemo}>Clear demo data</Button>
                </section>
              )}
              {!data.source && page === 0 && (
                <section className="panel callout project-empty">
                  <p>This project has no usage data yet.</p>
                  <Button onClick={() => setPage(5)}>Import usage data</Button>
                  <Button onClick={onDemo}>Load demo data</Button>
                </section>
              )}
              <div className="page-title">
                <h1>{nav[page][0]}</h1>
                <p>{nav[page][2]}</p>
              </div>
              {tour >= 0 && (
                <section className="panel callout tour">
                  <MascotAssistant />
                  <div>
                    <strong>
                      {
                        [
                          "See how tokens are used",
                          "Simulate unusual requests",
                          "Examine the evidence",
                          "Track an improvement",
                        ][tour]
                      }
                    </strong>
                    <p>
                      {
                        [
                          "Use filters to narrow the dashboard to an application or model.",
                          "Pick a scenario and start the simulator to see processing time.",
                          "Open a finding to see what exceeded the threshold.",
                          "Check supporting evidence and set a status after choosing an improvement.",
                        ][tour]
                      }
                    </p>
                  </div>
                  <div className="actions">
                    <Button onClick={() => setTour(-1)}>Close</Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (tour === 3) setTour(-1);
                        else {
                          setTour(tour + 1);
                          setPage(tour + 1);
                        }
                      }}
                    >
                      {tour === 3 ? "Finish" : "Next"} <ArrowRight size={15} />
                    </Button>
                  </div>
                </section>
              )}
              {[0, 2, 3, 4].includes(page) && (
                <section className="filters" aria-label="Usage filters">
                  {(
                    [
                      {
                        name: "provider",
                        value: (e: UsageEvent) => e.provider,
                      },
                      { name: "model", value: modelName },
                      {
                        name: "application",
                        value: (e: UsageEvent) => e.application,
                      },
                    ] as const
                  ).map(({ name, value }) => (
                    <label key={name}>
                      {name}
                      <select
                        value={filters[name]}
                        onChange={(e) =>
                          setFilters({ ...filters, [name]: e.target.value })
                        }
                      >
                        <option value="">All</option>
                        {[...new Set(data.events.map(value))]
                          .sort()
                          .map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                      </select>
                    </label>
                  ))}
                  <label>
                    From (UTC)
                    <input
                      type="date"
                      value={filters.from}
                      max={filters.to || undefined}
                      onChange={(e) =>
                        setFilters({ ...filters, from: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    To (UTC)
                    <input
                      type="date"
                      value={filters.to}
                      min={filters.from || undefined}
                      onChange={(e) =>
                        setFilters({ ...filters, to: e.target.value })
                      }
                    />
                  </label>
                  <Button onClick={() => setFilters(blankFilters)}>
                    Clear
                  </Button>
                </section>
              )}
              {page === 0 && (
                <Overview
                  events={events}
                  pricing={settings.pricing}
                  findings={findings}
                />
              )}
              <div hidden={page !== 1}>
                <Live key={liveKey} settings={settings} />
              </div>
              {page === 2 && (
                <Findings
                  {...{ findings, cacheEvaluated, events }}
                  pricing={settings.pricing}
                />
              )}
              {page === 3 && (
                <Recommendations
                  findings={findings}
                  pricing={settings.pricing}
                  statuses={data.statuses}
                  update={updateStatus}
                />
              )}
              {page === 4 && (
                <Breakdown
                  events={events}
                  pricing={settings.pricing}
                  findings={findings}
                />
              )}
              {page === 5 && (
                <SettingsView
                  {...{ settings, update, onImport, onDemo }}
                  onClearDemo={data.source === "demo" ? onClearDemo : undefined}
                  onTour={runTour}
                />
              )}
            </div>
          </main>
          <Assistant
            page={nav[page][0]}
            findings={findings}
            advanced={["Advanced", "Experienced"].includes(
              settings.profile.familiarity,
            )}
          />
        </div>
      )}
    </div>
  );
}
