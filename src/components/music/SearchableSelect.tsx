import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchPicker } from "@/components/ui/search-picker";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

export default function SearchableSelect({
  label,
  value,
  options,
  onValueChange,
  searchPlaceholder = "Search…",
  disabled = false,
  className,
}: {
  label: string;
  value: string;
  options: Option[];
  onValueChange: (value: string) => void;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
            }
          }}
          className={cn(
            "flex h-10 w-full min-w-0 items-center justify-between gap-4 border border-input bg-background px-3 text-left text-sm transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50",
            className,
          )}
        >
          <span className="truncate">{options.find((option) => option.value === value)?.label ?? label}</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] rounded-none p-0">
        <SearchPicker
          inline
          label={`Search ${label.toLowerCase()}`}
          placeholder={searchPlaceholder}
          options={options.map((option) => ({ ...option, checked: value === option.value }))}
          onSelect={(option) => {
            onValueChange(option.value);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
