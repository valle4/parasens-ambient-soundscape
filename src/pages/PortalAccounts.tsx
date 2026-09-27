import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PortalShell, { LoadError } from "@/components/portal/PortalShell";
import {
  artistDirectory,
  rows,
  portalRpc,
  portalAdmin,
  type Account,
} from "@/lib/portal/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
export default function PortalAccounts() {
  const cache = useQueryClient();
  const directory = useQuery({
    queryKey: ["portal-directory"],
    queryFn: artistDirectory,
  });
  const accounts = useQuery({
    queryKey: ["portal-accounts"],
    queryFn: () => rows<Account>("portal_accounts"),
  });
  const members = useQuery({
    queryKey: ["portal-members"],
    queryFn: () =>
      rows<{ artist_id: string; account_email: string }>(
        "portal_artist_members",
      ),
  });
  const admins = useQuery({
    queryKey: ["music-administrators"],
    queryFn: async () => {
      const { musicClient } = await import("@/lib/music/api");
      const { data, error } = await musicClient()
        .from("music_admins")
        .select("email,role");
      if (error) throw error;
      return data as { email: string; role: string }[];
    },
  });
  const [editing, setEditing] = useState<Account | null | undefined>();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [artists, setArtists] = useState<string[]>([]);
  const [isAdmin, setAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const [artistSearch, setArtistSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () =>
    Promise.all([
      cache.invalidateQueries({ queryKey: ["portal-accounts"] }),
      cache.invalidateQueries({ queryKey: ["portal-members"] }),
      cache.invalidateQueries({ queryKey: ["music-administrators"] }),
    ]);
  const edit = (account: Account | null) => {
    setEditing(account);
    setEmail(account?.email ?? "");
    setName(account?.display_name ?? "");
    setArtists(
      members.data
        ?.filter((m) => m.account_email === account?.email)
        .map((m) => m.artist_id) ?? [],
    );
    setAdmin(Boolean(admins.data?.some((a) => a.email === account?.email)));
    setArtistSearch("");
  };
  const invite = async (address: string) => {
    setBusy(true);
    try {
      const result = await portalAdmin({ action: "invite", email: address });
      toast.success(result.message);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invitation failed.");
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <PortalShell
      title="Accounts"
      description="Invite people and manage which artist names they can access. Several people can share an act."
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Input
          aria-label="Search accounts"
          placeholder="Search name or email…"
          className="max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          disabled={!members.data || !admins.data}
          onClick={() => edit(null)}
        >
          Invite account
        </Button>
      </div>
      {accounts.isError && <LoadError retry={() => accounts.refetch()} />}
      {(members.isError || admins.isError || directory.isError) && (
        <LoadError
          retry={() => {
            void members.refetch();
            void admins.refetch();
            void directory.refetch();
          }}
        />
      )}
      <div className="grid items-start gap-7 lg:grid-cols-2">
        <div className="divide-y divide-border border-y border-border">
          {accounts.data
            ?.filter((a) =>
              `${a.email} ${a.display_name}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((a) => (
              <div key={a.email} className="space-y-3 py-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="break-all text-sm">
                      {a.display_name || a.email}
                    </p>
                    {a.display_name && (
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {a.email}
                      </p>
                    )}
                  </div>
                  <button
                    className="text-xs underline"
                    disabled={busy || !members.data || !admins.data}
                    onClick={() => edit(a)}
                  >
                    Edit access
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {admins.data?.some((admin) => admin.email === a.email)
                    ? "Administrator"
                    : "Artist account"}{" "}
                  ·{" "}
                  {a.user_id
                    ? "Account created"
                    : a.invitation_status === "sent"
                      ? "Invitation sent"
                      : a.invitation_status === "uncertain"
                        ? "Check invitation delivery"
                        : a.invitation_status === "failed"
                          ? "Invitation needs retry"
                          : "Not yet invited"}
                </p>
                <p className="text-xs">
                  {members.data
                    ?.filter((m) => m.account_email === a.email)
                    .map(
                      (m) =>
                        directory.data?.artists.find(
                          (artist) => artist.id === m.artist_id,
                        )?.name,
                    )
                    .filter(Boolean)
                    .join(", ") || "No artist names assigned"}
                </p>
                {!a.user_id && (
                  <button
                    className="text-xs underline"
                    disabled={busy || a.invitation_status === "uncertain"}
                    onClick={() => void invite(a.email)}
                  >
                    {a.invitation_status === "sent"
                      ? "Send a new invitation"
                      : "Send invitation"}
                  </button>
                )}
              </div>
            ))}
        </div>
        {editing !== undefined && (
          <form
            className="space-y-5 border border-border p-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await portalRpc("portal_save_account", {
                  p_email: email,
                  p_name: name,
                  p_artists: artists,
                  p_admin: isAdmin,
                });
                await refresh();
                if (editing === null) {
                  const result = await portalAdmin({ action: "invite", email });
                  toast.success(result.message);
                } else toast.success("Account access updated.");
                setEditing(undefined);
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : "Could not save account.",
                );
              } finally {
                await refresh();
                setBusy(false);
              }
            }}
          >
            <h2 className="font-display text-xl">
              {editing ? "Edit account" : "Invite account"}
            </h2>
            <label className="block space-y-2 text-sm">
              <span>Email</span>
              <Input
                required
                type="email"
                disabled={Boolean(editing)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span>Name (optional)</span>
              <Input
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={isAdmin}
                onCheckedChange={(v) => setAdmin(v === true)}
              />
              <span>
                Administrator
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Full access to submissions, accounts, artists and website
                  music.
                </span>
              </span>
            </label>
            <fieldset className="space-y-3">
              <legend className="mb-3 text-sm">Assigned artist names</legend>
              <Input
                aria-label="Search artist assignments"
                placeholder="Search artists…"
                value={artistSearch}
                onChange={(e) => setArtistSearch(e.target.value)}
              />
              <div className="max-h-56 space-y-3 overflow-auto">
                {directory.data?.artists
                  .filter((a) =>
                    a.name.toLowerCase().includes(artistSearch.toLowerCase()),
                  )
                  .map((a) => (
                    <label
                      key={a.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <Checkbox
                        checked={artists.includes(a.id)}
                        onCheckedChange={(v) =>
                          setArtists((old) =>
                            v
                              ? [...old, a.id]
                              : old.filter((id) => id !== a.id),
                          )
                        }
                      />
                      {a.name}
                    </label>
                  ))}
              </div>
            </fieldset>
            <div className="flex gap-3">
              <Button disabled={busy}>
                {busy
                  ? "Saving…"
                  : editing
                    ? "Save access"
                    : "Save & send invitation"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(undefined)}
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Artist assignments can be changed at any time. New invitations are
              valid for 72 hours.
            </p>
          </form>
        )}
      </div>
    </PortalShell>
  );
}
