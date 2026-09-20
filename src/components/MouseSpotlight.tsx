import { useEffect, useRef } from "react";

const MouseSpotlight = () => {
  const spotlight = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const enabled = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let stop = () => {};
    const setup = () => {
      stop();
      if (!enabled.matches) return;
      const element = spotlight.current!;
      let frame = 0;
      let x = 0;
      let y = 0;
      const move = (event: PointerEvent) => {
        x = event.clientX;
        y = event.clientY;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          element.style.transform = `translate3d(${x - 300}px, ${y - 300}px, 0)`;
          element.style.opacity = "1";
        });
      };
      const hide = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        element.style.opacity = "0";
      };
      const out = (event: PointerEvent) => {
        if (!event.relatedTarget) hide();
      };
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerout", out);
      window.addEventListener("blur", hide);
      stop = () => {
        hide();
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerout", out);
        window.removeEventListener("blur", hide);
      };
    };
    setup();
    enabled.addEventListener("change", setup);
    return () => {
      stop();
      enabled.removeEventListener("change", setup);
    };
  }, []);

  return <div ref={spotlight} aria-hidden="true" className="mouse-spotlight" />;
};

export default MouseSpotlight;
