/** Convert an insertion edge to the one-based position expected by the server. */
export function dropPosition(
  ids: readonly string[],
  draggedId: string,
  targetId: string,
  edge: "before" | "after",
): number | null {
  const from = ids.indexOf(draggedId);
  const target = ids.indexOf(targetId);
  if (from < 0 || target < 0 || from === target) return null;
  const insertion = target + (edge === "after" ? 1 : 0);
  const to = insertion - (from < insertion ? 1 : 0);
  return to === from ? null : to + 1;
}
