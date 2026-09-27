import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PortalShell, { LoadError } from "@/components/portal/PortalShell";
import {
  artistDirectory,
  rows,
  portalRpc,
  type Artist,
} from "@/lib/portal/api";
import { categoryLabel } from "@/lib/music/catalogue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
export default function PortalArtists() {
  const cache = useQueryClient();
  const directory = useQuery({
    queryKey: ["portal-directory"],
    queryFn: artistDirectory,
  });
  const members = useQuery({
    queryKey: ["portal-members"],
    queryFn: () =>
      rows<{ artist_id: string; account_email: string }>(
        "portal_artist_members",
      ),
  });
  const [editing, setEditing] = useState<Artist | null | undefined>();
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [genreSearch, setGenreSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const edit = (artist: Artist | null) => {
    setEditing(artist);
    setName(artist?.name ?? "");
    setLabel(
      directory.data?.labels.find((l) => l.id === artist?.label_id)?.name ?? "",
    );
    setGenres(
      directory.data?.links
        .filter((g) => g.artist_id === artist?.id)
        .map((g) => g.category_id) ?? [],
    );
    setGenreSearch("");
  };
  return (
    <PortalShell
      title="Artists"
      description="Manage artist names, their labels and genres, and the accounts sharing each act."
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Input
          aria-label="Search artists"
          placeholder="Search artist names…"
          className="max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={() => edit(null)}>Add artist</Button>
        <Link
          to="/portal/admin/submissions"
          className="self-center text-xs underline"
        >
          Review suggested names in Submissions
        </Link>
      </div>
      {directory.isError && <LoadError retry={() => directory.refetch()} />}
      <div className="grid items-start gap-7 lg:grid-cols-2">
        <div className="divide-y divide-border border-y border-border">
          {directory.data?.artists
            .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
            .map((a) => (
              <div key={a.id} className="space-y-3 py-5">
                <div className="flex justify-between gap-4">
                  <h2 className="font-display text-xl">{a.name}</h2>
                  <button onClick={() => edit(a)} className="text-xs underline">
                    Edit artist
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {directory.data.labels.find((l) => l.id === a.label_id)
                    ?.name || "No label assigned"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {directory.data.links
                    .filter((g) => g.artist_id === a.id)
                    .map((g) => {
                      const c = directory.data.genres.find(
                        (c) => c.id === g.category_id,
                      );
                      return c ? (
                        <span
                          key={c.id}
                          className="border border-border px-2 py-1 text-xs"
                        >
                          {categoryLabel(c, directory.data.genres)}
                        </span>
                      ) : null;
                    })}
                </div>
                <p className="break-words text-xs text-muted-foreground">
                  Accounts:{" "}
                  {members.data
                    ?.filter((m) => m.artist_id === a.id)
                    .map((m) => m.account_email)
                    .join(", ") || "None assigned"}
                </p>
                <div className="flex gap-5 text-xs">
                  <Link
                    to={`/portal/admin/submissions?artist=${a.id}`}
                    className="underline"
                  >
                    View submissions
                  </Link>
                  <Link to="/portal/admin/accounts" className="underline">
                    Manage accounts
                  </Link>
                </div>
              </div>
            ))}
          {directory.data?.artists.length === 0 && (
            <p className="py-10 text-sm text-muted-foreground">
              Add the first artist name to start assigning accounts.
            </p>
          )}
        </div>
        {editing !== undefined && (
          <form
            className="space-y-5 border border-border p-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await portalRpc("portal_save_artist", {
                  p_name: name,
                  p_label: label,
                  p_genres: genres,
                  p_id: editing?.id ?? null,
                });
                await cache.invalidateQueries({
                  queryKey: ["portal-directory"],
                });
                toast.success("Artist saved.");
                setEditing(undefined);
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : "Could not save artist.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2 className="font-display text-xl">
              {editing ? "Edit artist" : "New artist"}
            </h2>
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
                {directory.data?.labels.map((l) => (
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
                {directory.data?.genres
                  .filter((c) =>
                    categoryLabel(c, directory.data.genres)
                      .toLowerCase()
                      .includes(genreSearch.toLowerCase()),
                  )
                  .map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 text-sm"
                    >
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
                      {categoryLabel(c, directory.data.genres)}
                    </label>
                  ))}
              </div>
            </fieldset>
            <div className="flex gap-3">
              <Button disabled={busy || !name.trim()}>
                {busy ? "Saving…" : "Save artist"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(undefined)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </PortalShell>
  );
}
