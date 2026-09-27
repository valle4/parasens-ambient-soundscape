import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [genreSearch, setGenreSearch] = useState("");
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
        <Input
          list="portal-labels"
          maxLength={120}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Choose or enter a label"
        />
        <datalist id="portal-labels">
          {directory?.labels.map((l) => (
            <option key={l.id} value={l.name} />
          ))}
        </datalist>
      </label>
      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm">Genre tags</legend>
        <Input
          aria-label="Search artist genres"
          placeholder="Search genres…"
          value={genreSearch}
          onChange={(e) => setGenreSearch(e.target.value)}
        />
        <div className="max-h-56 space-y-3 overflow-auto">
          {directory?.genres
            .filter((c) =>
              categoryLabel(c, directory.genres)
                .toLowerCase()
                .includes(genreSearch.toLowerCase()),
            )
            .map((c) => (
              <label key={c.id} className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={genres.includes(c.id)}
                  onCheckedChange={(checked) =>
                    setGenres((old) =>
                      checked
                        ? [...old, c.id]
                        : old.filter((id) => id !== c.id),
                    )
                  }
                />
                {categoryLabel(c, directory.genres)}
              </label>
            ))}
        </div>
      </fieldset>
    </>
  );
}
