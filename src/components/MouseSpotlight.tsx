import { useEffect, useState, useCallback } from "react";

const MouseSpotlight = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Use requestAnimationFrame for smooth performance
    requestAnimationFrame(() => {
      setPosition({ x: e.clientX, y: e.clientY });
    });
    if (!isVisible) setIsVisible(true);
  }, [isVisible]);

  useEffect(() => {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Check for touch device
    if ('ontouchstart' in window) return;

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", () => setIsVisible(false));
    window.addEventListener("mouseenter", () => setIsVisible(true));

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseMove]);

  if (typeof window !== 'undefined' && 'ontouchstart' in window) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] transition-opacity duration-500"
      style={{
        opacity: isVisible ? 1 : 0,
        background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, hsla(260, 50%, 30%, 0.08), transparent 40%)`,
      }}
    />
  );
};

export default MouseSpotlight;
