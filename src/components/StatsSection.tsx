import { AudioLines, Disc3, TrendingUp } from "lucide-react";

const stats = [
  {
    value: "2B",
    label: "Total streams",
    icon: AudioLines,
    accent: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20",
  },
  {
    value: "1,500+",
    label: "Tracks released",
    icon: Disc3,
    accent: "bg-blue-400/10 text-blue-400 ring-blue-400/20",
  },
  {
    value: "350+",
    label: "Tracks with 1M+ streams",
    icon: TrendingUp,
    accent: "bg-violet-400/10 text-violet-400 ring-violet-400/20",
  },
];

const StatsSection = () => (
  <section
    id="in-numbers"
    aria-labelledby="stats-heading"
    className="relative isolate flex min-h-[100svh] items-center overflow-hidden border-y border-white/5 bg-[#050505] px-6 py-28 md:px-12 md:py-32 lg:px-24"
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(89,67,130,0.10),transparent_65%)]"
    />
    <div className="mx-auto w-full max-w-6xl">
      <h2
        id="stats-heading"
        className="mb-12 text-center font-display text-3xl font-medium tracking-tight text-foreground md:mb-16 md:text-4xl"
      >
        In numbers
      </h2>
      <dl className="mx-auto grid max-w-sm grid-cols-1 gap-4 md:max-w-none md:grid-cols-3 md:gap-5 lg:gap-6">
        {stats.map(({ value, label, icon: Icon, accent }) => (
          <div
            key={label}
            className="flex min-w-0 flex-col items-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.045] to-white/[0.015] px-4 py-9 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_12px_40px_rgba(0,0,0,0.15)] lg:px-6 lg:py-11"
          >
            <dt className="order-2 mt-4 text-sm leading-relaxed text-foreground/60 lg:text-base">
              {label}
            </dt>
            <dd className="order-1 flex items-center justify-center gap-3 whitespace-nowrap lg:gap-4">
              <span
                aria-hidden="true"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset lg:h-11 lg:w-11 ${accent}`}
              >
                <Icon className="h-5 w-5 lg:h-6 lg:w-6" strokeWidth={1.75} />
              </span>
              <span className="font-body text-5xl font-semibold leading-none tracking-[-0.045em] text-foreground tabular-nums md:text-[clamp(2.25rem,3.8vw,3.5rem)]">
                {value}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);

export default StatsSection;
