import { useEffect, useId, useRef, useState } from "react";
import { Check, Minus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchOption = {
  value: string;
  label: string;
  checked?: boolean | "indeterminate";
  disabled?: boolean;
};

/** Shared keyboard interaction for portal filters and single/multiple pickers. */
export function SearchPicker({
  label,
  placeholder = "Search…",
  options,
  onSelect,
  value,
  onValueChange,
  multiple = false,
  inline = false,
  disabled = false,
  className,
  emptyMessage = "No matches found.",
}: {
  label: string;
  placeholder?: string;
  options: SearchOption[];
  onSelect: (option: SearchOption) => void;
  value?: string;
  onValueChange?: (value: string) => void;
  multiple?: boolean;
  inline?: boolean;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef(new Map<string, HTMLDivElement>());
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(inline);
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const search = value ?? query;
  const matches = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const enabled = matches.filter((option) => !option.disabled);
  const active = enabled.find((option) => option.value === activeValue) ?? enabled[0];
  const activeId = active?.value;
  const expanded = open && !disabled;
  const activeIndex = matches.findIndex((option) => option.value === active?.value);

  useEffect(() => {
    if (expanded && activeId !== undefined)
      optionRefs.current.get(activeId)?.scrollIntoView({ block: "nearest" });
  }, [expanded, activeId]);

  const choose = (option: SearchOption) => {
    if (disabled || option.disabled) return;
    onSelect(option);
    if (!multiple) setOpen(false);
  };

  return (
    <div
      className={cn("relative w-full min-w-0", className)}
      onBlur={(event) => {
        // Keep embedded lists in place so blur cannot move a dialog button
        // between pointer-down and click. Floating suggestions can dismiss.
        if (!inline && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={`${id}-results`}
          aria-activedescendant={expanded && active ? `${id}-option-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={search}
          disabled={disabled}
          className="rounded-none pl-10"
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            onValueChange?.(event.target.value);
            setActiveValue(null);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              const current = enabled.findIndex((option) => option.value === active?.value);
              const next = !expanded
                ? event.key === "ArrowDown" ? 0 : enabled.length - 1
                : (current + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length;
              setActiveValue(enabled[next]?.value ?? null);
            } else if (event.key === "Enter") {
              // Selecting a result must never submit the surrounding artist form.
              event.preventDefault();
              if (expanded && active) choose(active);
              else setOpen(true);
            } else if (event.key === "Escape" && expanded) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            } else if (event.key === "Tab") {
              setOpen(false);
            }
          }}
        />
      </div>
      {expanded && (
        <div
          id={`${id}-results`}
          role="listbox"
          aria-label={`${label} results`}
          aria-multiselectable={multiple || undefined}
          className={cn(
            "max-h-56 overflow-auto overscroll-contain border border-border bg-background p-1",
            inline ? "mt-2" : "absolute left-0 right-0 top-full z-50 mt-1 shadow-lg",
          )}
        >
          {matches.length === 0 && <p role="status" className="p-3 text-sm text-muted-foreground">{emptyMessage}</p>}
          {matches.map((option, index) => (
            <div
              key={option.value}
              id={`${id}-option-${index}`}
              ref={(element) => {
                if (element) optionRefs.current.set(option.value, element);
                else optionRefs.current.delete(option.value);
              }}
              role="option"
              aria-label={option.label}
              aria-selected={option.checked === true}
              aria-checked={multiple ? option.checked === "indeterminate" ? "mixed" : option.checked ?? false : undefined}
              aria-disabled={option.disabled || undefined}
              data-active={option.value === active?.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 border border-transparent px-3 py-2 text-sm",
                option.value === active?.value && "border-foreground/40 text-foreground",
                option.disabled && "cursor-not-allowed opacity-50",
              )}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => { if (!option.disabled) setActiveValue(option.value); }}
              onClick={() => { choose(option); inputRef.current?.focus(); }}
            >
              {(multiple || option.checked !== undefined) && (
                <span aria-hidden="true" className={cn("flex h-4 w-4 shrink-0 items-center justify-center", multiple && "border border-muted-foreground/50")}>
                  {option.checked === "indeterminate" ? <Minus className="h-3 w-3" /> : option.checked ? <Check className="h-3 w-3" /> : null}
                </span>
              )}
              <span className="min-w-0 break-words">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
