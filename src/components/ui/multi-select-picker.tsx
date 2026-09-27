import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchPicker, type SearchOption } from "@/components/ui/search-picker";

/** Show current assignments, and reveal the searchable choices on demand. */
export function MultiSelectPicker({
  label,
  searchLabel,
  placeholder,
  options,
  onSelect,
  emptyMessage,
}: {
  label: string;
  searchLabel: string;
  placeholder: string;
  options: SearchOption[];
  onSelect: (option: SearchOption) => void;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((option) => option.checked === true);

  return (
    <div className="min-w-0 space-y-3">
      {selected.length > 0 && (
        <ul aria-label={`${label} selections`} className="flex flex-wrap gap-2">
          {selected.map((option) => (
            <li key={option.value} className="flex max-w-full items-center gap-2 border border-border py-1 pl-3 pr-1 text-sm">
              <span className="min-w-0 break-words">{option.label}</span>
              <button
                type="button"
                aria-label={`Remove ${option.label}`}
                disabled={option.disabled}
                onClick={() => onSelect(option)}
                className="shrink-0 p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
              }
            }}
            className="flex min-h-10 w-full items-center justify-between gap-4 border border-input bg-background px-3 py-2 text-left text-sm hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>{label}</span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] overflow-y-auto rounded-none p-0"
        >
          <SearchPicker
            inline
            multiple
            label={searchLabel}
            placeholder={placeholder}
            options={options}
            onSelect={onSelect}
            emptyMessage={emptyMessage}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full border-t border-border px-3 py-2 text-right text-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            Done
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
