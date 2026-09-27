import { Input } from "@/components/ui/input";
import { SearchPicker } from "@/components/ui/search-picker";
import { categoryLabel } from "@/lib/music/catalogue";
import { artistDirectory } from "@/lib/portal/api";

type Directory = Awaited<ReturnType<typeof artistDirectory>>;
export default function ArtistFields({
  directory,
  name,
  setName,
  label,
  setLabel,
  genres,
  setGenres,
}: {
  directory: Directory;
  name: string;
  setName: (value: string) => void;
  label: string;
  setLabel: (value: string) => void;
  genres: string[];
  setGenres: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  return (
    <>
      <label className="block space-y-2 text-sm">
        <span>Artist name</span>
        <Input
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block space-y-2 text-sm">
        <span>Label</span>
        <SearchPicker
          label="Artist label"
          value={label}
          onValueChange={(value) => setLabel(value.slice(0, 120))}
          placeholder="Choose or enter a label"
          options={directory.labels.map((label) => ({ value: label.id, label: label.name }))}
          onSelect={(option) => setLabel(option.label)}
          emptyMessage="No matching labels. You can use the name you typed."
        />
      </label>
      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm">Genre tags</legend>
        <SearchPicker
          inline
          multiple
          label="Search artist genres"
          placeholder="Search genres…"
          options={directory.genres.map((c) => ({
            value: c.id,
            label: categoryLabel(c, directory.genres),
            checked: genres.includes(c.id),
          }))}
          onSelect={(option) => setGenres((old) =>
            old.includes(option.value) ? old.filter((id) => id !== option.value) : [...old, option.value],
          )}
        />
      </fieldset>
    </>
  );
}
