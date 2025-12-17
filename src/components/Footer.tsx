import useScrollReveal from "@/hooks/useScrollReveal";

const Footer = () => {
  const { ref, isRevealed } = useScrollReveal();

  return (
    <footer
      ref={ref}
      className={`px-6 md:px-12 lg:px-24 py-12 border-t border-border scroll-reveal ${isRevealed ? "revealed" : ""}`}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <p className="font-display text-sm tracking-[0.15em] font-semibold">
          PARASENS
        </p>

        <p className="text-muted-foreground text-xs tracking-wider">
          © {new Date().getFullYear()} PARASENS. All rights reserved.
        </p>

        <div className="flex items-center gap-6">
          <a
            href="#"
            className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-xs tracking-wider"
          >
            Privacy
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-xs tracking-wider"
          >
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
