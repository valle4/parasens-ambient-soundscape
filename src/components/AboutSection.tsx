import { useEffect, useRef, useState } from "react";
import useScrollReveal from "@/hooks/useScrollReveal";

const AboutSection = () => {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { ref: titleRef, isRevealed: titleRevealed } = useScrollReveal();

  const lines = [
    "PARASENS exists for the in-between moments.",
    "The pause before sleep. The quiet focus of early morning.",
    "The stillness that allows thought to settle.",
    "",
    "We curate soundscapes that create space—",
    "not to fill silence, but to shape it.",
    "",
    "No algorithms. No interruptions.",
    "Just intentional music for intentional listening.",
    "",
    "This is mood, managed.",
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          lines.forEach((_, index) => {
            setTimeout(() => {
              setVisibleLines((prev) => [...prev, index]);
            }, index * 150);
          });
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="min-h-screen section-padding flex items-center"
    >
        <div className="max-w-3xl mx-auto text-center">
        <div
          ref={titleRef}
          className={`scroll-reveal ${titleRevealed ? "revealed" : ""}`}
        >
          <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase mb-12">
            About
          </p>
        </div>

        <div className="space-y-2">
          {lines.map((line, index) => (
            <p
              key={index}
              className={`text-xl md:text-2xl lg:text-3xl leading-relaxed font-light transition-all duration-700 ${
                visibleLines.includes(index)
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              } ${line === "" ? "h-6" : ""} ${
                line.startsWith("This is") ? "font-display font-semibold mt-8 text-gradient" : ""
              }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
