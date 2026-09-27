import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
        <Command className="rounded-none">
          <CommandInput aria-label={`Search ${label.toLowerCase()}`} placeholder={searchPlaceholder} />
          <CommandList className="max-h-[min(18rem,var(--radix-popover-content-available-height))] overscroll-contain">
            <CommandEmpty>No matches found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`option:${option.value}`}
                  keywords={[option.label]}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="gap-2 rounded-none py-2"
                >
                  <Check aria-hidden="true" className={cn("h-4 w-4 shrink-0", value === option.value ? "opacity-100" : "opacity-0")} />
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
