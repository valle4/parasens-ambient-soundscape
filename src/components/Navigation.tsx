import { useState, useEffect } from "react";
import MagneticLink from "./MagneticLink";

const navItems = [
  { label: "Music", href: "#music" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const Navigation = () => {
  const [activeSection, setActiveSection] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      const sections = ["music", "about", "contact"];
      const scrollPosition = window.scrollY + 200;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }

      if (window.scrollY < 200) {
        setActiveSection("");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        isScrolled ? "bg-background/90 backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-6 md:px-12 lg:px-24 py-6">
        <MagneticLink
          href="#"
          className="font-display text-lg tracking-[0.15em] font-semibold hover:opacity-70 transition-opacity duration-500"
          strength={0.2}
        >
          PARASENS
        </MagneticLink>

        <div className="flex items-center gap-8 md:gap-12">
          {navItems.map((item) => (
            <MagneticLink
              key={item.href}
              href={item.href}
              className={`nav-link ${
                activeSection === item.href.slice(1) ? "nav-link-active" : ""
              }`}
              strength={0.4}
            >
              {item.label}
            </MagneticLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
