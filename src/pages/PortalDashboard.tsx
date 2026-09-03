import { useState } from "react";
import { ArrowRight, Check, Clock3, FileEdit, LogOut, Plus } from "lucide-react";
import { Link } from "react-router-dom";

type CatalogueTab = "drafts" | "submitted" | "accepted";

type CatalogueItem = {
  id: string;
  title: string;
  description: string;
  dateLabel: string;
  status: string;
};

const tabs: Array<{ id: CatalogueTab; label: string; count: number }> = [
  { id: "drafts", label: "Drafts", count: 2 },
  { id: "submitted", label: "Submitted", count: 3 },
  { id: "accepted", label: "Accepted", count: 3 },
];

const catalogue: Record<CatalogueTab, CatalogueItem[]> = {
  drafts: [
    {
      id: "quiet-geometry",
      title: "Quiet Geometry",
      description: "Single · 1 track",
      dateLabel: "Edited 2 Sep 2026",
      status: "Continue draft",
    },
    {
      id: "soft-focus",
      title: "Soft Focus",
      description: "EP · 4 tracks",
      dateLabel: "Edited 29 Aug 2026",
      status: "Continue draft",
    },
  ],
  submitted: [
    {
      id: "still-current",
      title: "Still Current",
      description: "Single · 1 track",
      dateLabel: "Submitted 1 Sep 2026",
      status: "Under review",
    },
    {
      id: "tidal-memory",
      title: "Tidal Memory",
      description: "EP · 3 tracks",
      dateLabel: "Submitted 24 Aug 2026",
      status: "Changes requested",
    },
    {
      id: "night-air",
      title: "Night Air",
      description: "Single · 1 track",
      dateLabel: "Submitted 17 Aug 2026",
      status: "Submitted",
    },
  ],
  accepted: [
    {
      id: "glass-horizon",
      title: "Glass Horizon",
      description: "From Quiet Forms · Track",
      dateLabel: "Accepted 21 Aug 2026",
      status: "Accepted",
    },
    {
      id: "low-tides",
      title: "Low Tides",
      description: "From Tidal Memory · Track",
      dateLabel: "Accepted 10 Aug 2026",
      status: "Accepted",
    },
    {
      id: "almost-blue",
      title: "Almost Blue",
      description: "From Night Air · Track",
      dateLabel: "Accepted 28 Jul 2026",
      status: "Accepted",
    },
  ],
};

const tabIcons = {
  drafts: FileEdit,
  submitted: Clock3,
  accepted: Check,
};

const PortalDashboard = () => {
  const [activeTab, setActiveTab] = useState<CatalogueTab>("drafts");
  const activeItems = catalogue[activeTab];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-6 py-6 text-foreground md:px-12 md:py-8 lg:px-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,hsl(var(--foreground)/0.035),transparent_32%)]" />

      <header className="relative z-10 flex items-center justify-between border-b border-border pb-6 opacity-0 animate-fade-in">
        <Link
          to="/"
          aria-label="Return to the Parasens website"
          className="font-display text-base font-semibold tracking-[0.18em] transition-opacity duration-500 hover:opacity-60 md:text-lg"
        >
          PARASENS
        </Link>

        <div className="flex items-center gap-5 md:gap-8">
          <span className="hidden text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:inline">
            Artist portal
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <Link
            to="/portal"
            className="group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors duration-500 hover:text-foreground"
          >
            Sign out
            <LogOut aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-6xl pb-20 pt-20 opacity-0 animate-fade-up animation-delay-200 md:pt-28">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Artist catalogue
            </p>
            <h1 className="mt-5 font-display text-4xl font-medium tracking-[-0.025em] md:text-6xl">
              Catalogue
            </h1>
            <p className="mt-5 max-w-lg text-sm font-light leading-6 text-muted-foreground">
              Your drafts, submitted releases, and tracks accepted by PARASENS.
            </p>
          </div>

          <Link
            to="/portal/releases/new"
            className="group inline-flex w-full items-center justify-between gap-10 border border-foreground px-6 py-4 text-[10px] uppercase tracking-[0.2em] transition-all duration-500 hover:bg-foreground hover:text-background sm:w-auto"
          >
            New release
            <Plus aria-hidden="true" className="h-4 w-4 transition-transform duration-500 group-hover:rotate-90" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="mt-16 border-b border-border md:mt-20">
          <div className="grid grid-cols-3 md:flex md:gap-14">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center justify-center gap-2 pb-5 text-[9px] uppercase tracking-[0.16em] transition-colors duration-500 sm:text-[10px] md:justify-start md:gap-3 md:text-xs md:tracking-[0.2em] ${
                  activeTab === tab.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className="text-[10px] text-muted-foreground">{tab.count}</span>
                <span
                  className={`absolute bottom-0 left-0 h-px bg-foreground transition-all duration-500 ${
                    activeTab === tab.id ? "w-full opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4" aria-live="polite">
          <div className="hidden grid-cols-[1fr_0.65fr_0.45fr] gap-8 border-b border-border px-4 py-4 text-[9px] uppercase tracking-[0.24em] text-muted-foreground md:grid">
            <span>{activeTab === "accepted" ? "Track" : "Release"}</span>
            <span>Last activity</span>
            <span>Status</span>
          </div>

          {activeItems.map((item) => {
            const Icon = tabIcons[activeTab];

            return (
              <button
                key={item.id}
                type="button"
                className="group grid w-full gap-5 border-b border-border px-1 py-7 text-left transition-colors duration-500 hover:bg-foreground/[0.025] md:grid-cols-[1fr_0.65fr_0.45fr] md:items-center md:gap-8 md:px-4"
              >
                <span className="flex min-w-0 items-center gap-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-border bg-foreground/[0.015] transition-colors duration-500 group-hover:border-foreground/40">
                    <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" strokeWidth={1.25} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-base tracking-[-0.01em] md:text-lg">
                      {item.title}
                    </span>
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </span>

                <span className="text-xs text-muted-foreground">{item.dateLabel}</span>

                <span className="flex items-center justify-between gap-4 text-xs">
                  <span className={activeTab === "accepted" ? "text-foreground" : "text-muted-foreground"}>
                    {item.status}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-500 group-hover:translate-x-1 group-hover:text-foreground"
                    strokeWidth={1.5}
                  />
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
          Prototype data — nothing here is saved
        </p>
      </section>
    </main>
  );
};

export default PortalDashboard;
