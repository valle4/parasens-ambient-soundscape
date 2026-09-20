import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import { dropPosition } from "@/lib/music/reorder";

type DropTarget = { id: string; edge: "before" | "after" };

export function useSongDrag({
  container,
  ids,
  enabled,
  onMove,
}: {
  container: RefObject<HTMLDivElement>;
  ids: string[];
  enabled: boolean;
  onMove: (id: string, position: number) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const cleanup = useRef<() => void>(() => {});
  const cancelDrag = useCallback(() => {
    cleanup.current();
    setDragging(null);
    setDropTarget(null);
  }, []);
  // Cancel if a refresh, filter or permission change invalidates the drag.
  const identity = ids.join(",");
  useEffect(() => {
    cancelDrag();
    return () => cleanup.current();
  }, [identity, enabled, cancelDrag]);

  const startDrag = (
    event: PointerEvent<HTMLButtonElement>,
    id: string,
    title: string,
  ) => {
    if (
      !enabled ||
      event.button !== 0 ||
      !event.isPrimary ||
      !container.current
    )
      return;
    cancelDrag();
    const box = container.current;
    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    const startX = event.clientX,
      startY = event.clientY;
    let x = startX,
      y = startY,
      active = false,
      frame = 0;
    let target: DropTarget | null = null;
    let ghost: HTMLDivElement | null = null;
    handle.setPointerCapture(pointerId);

    const clear = () => {
      cancelAnimationFrame(frame);
      ghost?.remove();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", cancel);
      handle.removeEventListener("lostpointercapture", cancel);
      if (handle.hasPointerCapture(pointerId))
        handle.releasePointerCapture(pointerId);
      cleanup.current = () => {};
    };
    const showTarget = (next: DropTarget | null) => {
      if (next?.id === target?.id && next?.edge === target?.edge) return;
      target = next;
      setDropTarget(next);
    };
    const locate = () => {
      const bounds = box.getBoundingClientRect();
      if (
        x < bounds.left ||
        x > bounds.right ||
        y < bounds.top ||
        y > bounds.bottom
      ) {
        showTarget(null);
        return;
      }
      const rows = Array.from(
        box.querySelectorAll<HTMLElement>("[data-song-row]"),
      );
      // Choose the nearest insertion edge, including empty space below the final row.
      const hit =
        rows.find((row) => y <= row.getBoundingClientRect().bottom) ??
        rows.at(-1);
      if (!hit) {
        showTarget(null);
        return;
      }
      const rect = hit.getBoundingClientRect();
      const edge = y < rect.top + rect.height / 2 ? "before" : "after";
      const targetId = hit.dataset.songRow!;
      showTarget(
        dropPosition(ids, id, targetId, edge) === null
          ? null
          : { id: targetId, edge },
      );
    };
    const tick = () => {
      if (!active) return;
      const bounds = box.getBoundingClientRect();
      const headerHeight =
        box.querySelector("thead")?.getBoundingClientRect().height ?? 0;
      if (
        x >= bounds.left &&
        x <= bounds.right &&
        y >= bounds.top &&
        y <= bounds.bottom
      ) {
        if (y < bounds.top + headerHeight + 35) box.scrollTop -= 10;
        else if (y > bounds.bottom - 45) box.scrollTop += 10;
      }
      if (ghost)
        ghost.style.transform = `translate3d(${Math.min(x + 16, window.innerWidth - 240)}px, ${y + 16}px, 0)`;
      locate();
      frame = requestAnimationFrame(tick);
    };
    const move = (e: globalThis.PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      x = e.clientX;
      y = e.clientY;
      if (!active && Math.hypot(x - startX, y - startY) >= 6) {
        active = true;
        setDragging(id);
        ghost = document.createElement("div");
        ghost.className = "song-drag-preview";
        ghost.textContent = title;
        ghost.setAttribute("aria-hidden", "true");
        document.body.appendChild(ghost);
        frame = requestAnimationFrame(tick);
      }
      if (active) e.preventDefault();
    };
    const cancel = () => {
      clear();
      setDragging(null);
      setDropTarget(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    };
    const end = (e: globalThis.PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      x = e.clientX;
      y = e.clientY;
      if (active) locate();
      const destination =
        active && target ? dropPosition(ids, id, target.id, target.edge) : null;
      cancel();
      if (destination !== null) onMove(id, destination);
    };
    cleanup.current = clear;
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    window.addEventListener("blur", cancel);
    handle.addEventListener("lostpointercapture", cancel);
  };
  return { dragging, dropTarget, startDrag, cancelDrag };
}
