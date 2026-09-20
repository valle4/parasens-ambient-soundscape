import { useEffect, useRef } from "react";

const interactive =
  'a, button, [role="button"], input, textarea, select, .cursor-hover';

const CustomCursor = () => {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const enabled = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let stop = () => {};
    const setup = () => {
      stop();
      if (!enabled.matches) return;
      const elements = [ring.current!, dot.current!];
      let frame = 0;
      let x = 0;
      let y = 0;
      const visible = (show: boolean) =>
        elements.forEach((el) => {
          el.style.opacity = show ? "1" : "0";
        });
      const hover = (target: EventTarget | null) => {
        const active =
          target instanceof Element && Boolean(target.closest(interactive));
        elements.forEach((el) => el.classList.toggle("hovering", active));
      };
      const move = (event: PointerEvent) => {
        x = event.clientX;
        y = event.clientY;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          elements.forEach((el) => {
            el.style.translate = `${x}px ${y}px`;
          });
          visible(true);
        });
      };
      // Delegation handles newly imported rows without per-element listeners.
      const over = (event: PointerEvent) => hover(event.target);
      const out = (event: PointerEvent) => {
        hover(event.relatedTarget);
        if (!event.relatedTarget) {
          cancelAnimationFrame(frame);
          frame = 0;
          visible(false);
        }
      };
      const down = () => elements.forEach((el) => el.classList.add("clicking"));
      const up = () =>
        elements.forEach((el) => el.classList.remove("clicking"));
      const blur = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        visible(false);
        up();
      };
      document.documentElement.classList.add("custom-cursor-active");
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerover", over);
      window.addEventListener("pointerout", out);
      window.addEventListener("pointerdown", down);
      window.addEventListener("pointerup", up);
      window.addEventListener("blur", blur);
      stop = () => {
        cancelAnimationFrame(frame);
        visible(false);
        document.documentElement.classList.remove("custom-cursor-active");
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerover", over);
        window.removeEventListener("pointerout", out);
        window.removeEventListener("pointerdown", down);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("blur", blur);
      };
    };
    setup();
    enabled.addEventListener("change", setup);
    return () => {
      stop();
      enabled.removeEventListener("change", setup);
    };
  }, []);

  return (
    <>
      <div ref={ring} aria-hidden="true" className="custom-cursor-ring" />
      <div ref={dot} aria-hidden="true" className="custom-cursor-dot" />
    </>
  );
};

export default CustomCursor;
