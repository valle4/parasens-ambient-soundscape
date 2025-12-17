const HeroSection = () => {
  return (
    <section className="min-h-screen flex flex-col justify-center section-padding pt-32">
      <div className="max-w-4xl">
        <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase mb-8 opacity-0 animate-fade-in animation-delay-200">
          Mood Music Management
        </p>

        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.1] tracking-tight opacity-0 animate-blur-in animation-delay-400">
          PARASENS
        </h1>

        <p className="mt-8 md:mt-12 text-xl md:text-2xl lg:text-3xl text-muted-foreground font-light leading-relaxed max-w-2xl opacity-0 animate-fade-up animation-delay-800">
          Music for focused, quiet moments.
        </p>

        <div className="mt-16 md:mt-24 opacity-0 animate-fade-in animation-delay-1000">
          <a
            href="#music"
            className="inline-flex items-center gap-3 text-sm tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-500 group"
          >
            <span>Explore</span>
            <svg
              className="w-4 h-4 transform group-hover:translate-y-1 transition-transform duration-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </a>
        </div>
      </div>

      {/* Subtle grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </section>
  );
};

export default HeroSection;
