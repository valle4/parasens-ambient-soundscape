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
  type Account,
} from "@/lib/portal/api";
import { categoryLabel } from "@/lib/music/catalogue";
import { Button } from "@/components/ui/button";
import { SearchPicker } from "@/components/ui/search-picker";
import { MultiSelectPicker } from "@/components/ui/multi-select-picker";
import ArtistFields from "@/components/portal/admin/ArtistFields";
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
  const accounts = useQuery({
    queryKey: ["portal-accounts"],
    queryFn: () => rows<Account>("portal_accounts"),
  });
  const [assignedAccounts, setAssignedAccounts] = useState<string[]>([]);
  const ready = Boolean(directory.data && accounts.data && members.data);
  const [editing, setEditing] = useState<Artist | null | undefined>();
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [search, setSearch] = useState("");
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
    setAssignedAccounts(
      members.data
        ?.filter((m) => m.artist_id === artist?.id)
        .map((m) => m.account_email) ?? [],
    );
  };
  return (
    <PortalShell
      title="Artists"
      description="Manage artist names, their labels and genres, and the accounts sharing each act."
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <SearchPicker
          label="Search artists"
          placeholder="Search artist names…"
          className="max-w-md"
          value={search}
          onValueChange={setSearch}
          options={(directory.data?.artists ?? []).map((artist) => ({ value: artist.id, label: artist.name }))}
          onSelect={(option) => {
            const artist = directory.data?.artists.find((artist) => artist.id === option.value);
            if (artist) edit(artist);
          }}
          disabled={!ready}
        />
        <Button disabled={busy || !ready} onClick={() => edit(null)}>
          Add artist
        </Button>
        <Link
          to="/portal/admin/submissions"
          className="self-center text-xs underline"
        >
          Review suggested names in Submissions
        </Link>
      </div>
      {(directory.isError || accounts.isError || members.isError) && (
        <LoadError
          retry={() => {
            void directory.refetch();
            void accounts.refetch();
            void members.refetch();
          }}
        />
      )}
      <div className="grid items-start gap-7 lg:grid-cols-2">
        <div className="divide-y divide-border border-y border-border">
          {directory.data?.artists
            .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
            .map((a) => (
              <div key={a.id} className="space-y-3 py-5">
                <div className="flex justify-between gap-4">
                  <h2 className="font-display text-xl">{a.name}</h2>
                  <button
                    disabled={busy || !ready}
                    onClick={() => edit(a)}
                    className="text-xs underline"
                  >
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
                await portalRpc("portal_save_artist_accounts", {
                  p_name: name,
                  p_label: label,
                  p_genres: genres,
                  p_id: editing?.id ?? null,
                  p_accounts: assignedAccounts,
                });
                await cache.invalidateQueries({
                  queryKey: ["portal-directory"],
                });
                await cache.invalidateQueries({ queryKey: ["portal-members"] });
                toast.success("Artist and account assignments saved.");
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
            <fieldset disabled={busy} className="space-y-5">
              <ArtistFields
                directory={directory.data!}
                name={name}
                setName={setName}
                label={label}
                setLabel={setLabel}
                genres={genres}
                setGenres={setGenres}
              />
              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm">Assigned accounts</legend>
                <MultiSelectPicker
                  label="Assign accounts"
                  searchLabel="Search accounts to assign"
                  placeholder="Search name or email…"
                  options={(accounts.data ?? []).map((account) => ({
                    value: account.email,
                    label: account.display_name ? `${account.display_name} · ${account.email}` : account.email,
                    checked: assignedAccounts.includes(account.email),
                  }))}
                  onSelect={(option) => setAssignedAccounts((old) =>
                    old.includes(option.value) ? old.filter((email) => email !== option.value) : [...old, option.value],
                  )}
                  emptyMessage={accounts.data?.length === 0 ? "Create an account in Accounts first, then assign it here." : "No matches found."}
                />
                <p className="text-xs text-muted-foreground">
                  Selected accounts can access this artist’s releases. Several
                  accounts can share an artist.
                </p>
              </fieldset>
            </fieldset>
            <div className="flex gap-3">
              <Button disabled={busy || !ready || !name.trim()}>
                {busy ? "Saving…" : "Save artist"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
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
