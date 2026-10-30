const stats = [
  { value: "2B", label: "Total streams" },
  { value: "1,500+", label: "Tracks released" },
  { value: "350+", label: "Tracks with 1M+ streams" },
];

const StatsSection = () => (
  <section
    id="in-numbers"
    aria-labelledby="stats-heading"
    className="relative scroll-mt-24 px-6 py-16 md:px-12 md:py-24 lg:px-24"
  >
    <div className="mx-auto max-w-6xl">
      <h2
        id="stats-heading"
        className="mb-10 text-center font-body text-xs font-normal uppercase tracking-[0.3em] text-muted-foreground md:mb-14"
      >
        In numbers
      </h2>
      <dl className="grid grid-cols-1 divide-y divide-border/70 border-y border-border/70 md:grid-cols-3 md:divide-x md:divide-y-0">
        {stats.map(({ value, label }) => (
          <div key={label} className="flex min-w-0 flex-col items-center px-4 py-10 text-center md:py-14">
            <dt className="order-2 mt-4 text-sm tracking-wide text-foreground/65 md:mt-5">
              {label}
            </dt>
            <dd className="order-1 whitespace-nowrap font-display text-[clamp(3.5rem,7vw,6.5rem)] font-semibold leading-none tracking-[-0.06em] text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);

export default StatsSection;
