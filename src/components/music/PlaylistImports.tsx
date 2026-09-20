import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePortalAuth } from "@/contexts/portal-auth";
import { loadPlaylists, musicRpc } from "@/lib/music/api";
import { spotifyId } from "@/lib/music/catalogue";
import {
  connectSpotify,
  disconnectSpotify,
  listSpotifyPlaylists,
  readSpotifyPlaylist,
  spotifyConfigured,
  spotifyConnected,
  type SpotifyPlaylist,
} from "@/lib/music/spotify";

export default function PlaylistImports({
  onChange,
}: {
  onChange: () => Promise<unknown>;
}) {
  const { user } = usePortalAuth();
  const [connected, setConnected] = useState(() => spotifyConnected(user.id));
  const [links, setLinks] = useState("");
  const [options, setOptions] = useState<SpotifyPlaylist[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [reports, setReports] = useState<string[]>([]);
  const abort = useRef<AbortController>();
  const saved = useQuery({
    queryKey: ["music-playlists", user.id],
    queryFn: loadPlaylists,
  });
  useEffect(() => () => abort.current?.abort(), []);
  const browse = async () => {
    setBusy(true);
    abort.current = new AbortController();
    try {
      setOptions(await listSpotifyPlaylists(user.id, abort.current.signal));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load playlists.");
    } finally {
      setBusy(false);
    }
  };
  const importIds = async (ids: string[]) => {
    if (busy) return;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setReports([]);
    try {
      for (const [index, id] of [...new Set(ids)].entries()) {
        if (controller.signal.aborted) break;
        const prefix = `Playlist ${index + 1} of ${new Set(ids).size}`;
        setProgress(`${prefix}: reading songs…`);
        try {
          const playlist = await readSpotifyPlaylist(
            id,
            user.id,
            (n) => setProgress(`${prefix}: ${n} songs read…`),
            controller.signal,
          );
          if (controller.signal.aborted) break;
          setProgress(`${playlist.name}: saving new songs…`);
          const result = await musicRpc<{ added: number; existing: number }>(
            "music_import_playlist",
            { p_id: id, p_name: playlist.name, p_tracks: playlist.tracks },
          );
          setReports((r) => [
            ...r,
            `${playlist.name}: ${result.added} new drafts · ${result.existing} already in your library${playlist.skipped ? ` · ${playlist.skipped} unavailable or non-song items skipped` : ""}.`,
          ]);
          await onChange();
          await saved.refetch();
        } catch (e) {
          if (controller.signal.aborted) break;
          setReports((r) => [
            ...r,
            `${prefix}: ${e instanceof Error ? e.message : "Import failed. Please retry."}`,
          ]);
        }
      }
    } finally {
      setProgress(
        controller.signal.aborted
          ? "Import stopped. Completed playlists were saved; you can safely retry."
          : "Import complete. Existing songs and archived tracks were left unchanged.",
      );
      setBusy(false);
      setConnected(spotifyConnected(user.id));
    }
  };
  const importLinks = () => {
    const values = links.split(/[\s,]+/).filter(Boolean);
    const ids = values.map((value) => spotifyId(value, "playlist"));
    if (!ids.length || ids.some((id) => !id)) {
      toast.error("Paste valid Spotify playlist links, one per line.");
      return;
    }
    void importIds(ids as string[]);
  };
  return (
    <section className="space-y-6 border border-border p-5 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl">Import from Spotify</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Only new songs become drafts. Existing songs, tags and archived
            choices stay as they are.
          </p>
        </div>
        {connected ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              disconnectSpotify();
              setConnected(false);
              setOptions([]);
            }}
          >
            Disconnect Spotify
          </Button>
        ) : (
          <Button
            disabled={!spotifyConfigured || busy}
            onClick={() =>
              void connectSpotify(user.id).catch((e) => toast.error(e.message))
            }
          >
            <Link2 className="mr-2 h-4 w-4" />
            Connect Spotify
          </Button>
        )}
      </div>
      {!spotifyConfigured && (
        <p className="rounded border border-border p-4 text-sm text-muted-foreground">
          Spotify connection is awaiting setup. You can still organise and
          publish the existing library.
        </p>
      )}
      {connected && (
        <>
          <label className="block text-sm">
            Playlist links
            <textarea
              className="mt-2 min-h-24 w-full border border-input bg-background p-3 text-sm"
              placeholder="Paste one or more Spotify playlist links, one per line"
              value={links}
              disabled={busy}
              onChange={(e) => setLinks(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button onClick={importLinks} disabled={busy || !links.trim()}>
              Import new songs
            </Button>
            <Button variant="outline" onClick={browse} disabled={busy}>
              Choose from my playlists
            </Button>
          </div>
          {options.length > 0 && (
            <div className="space-y-3">
              <div className="max-h-64 overflow-auto border border-border p-3 space-y-3">
                {options.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={chosen.has(p.id)}
                      onChange={(e) =>
                        setChosen((old) => {
                          const next = new Set(old);
                          if (e.target.checked) next.add(p.id);
                          else next.delete(p.id);
                          return next;
                        })
                      }
                    />
                    <span>
                      {p.name}
                      <span className="ml-2 text-muted-foreground">
                        {p.owner?.display_name}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <Button
                disabled={busy || !chosen.size}
                onClick={() => void importIds([...chosen])}
              >
                Import selected playlists ({chosen.size})
              </Button>
            </div>
          )}
        </>
      )}
      {saved.isError && (
        <p role="alert" className="text-sm">
          Could not load previously imported playlists.{" "}
          <button className="underline" onClick={() => saved.refetch()}>
            Retry
          </button>
        </p>
      )}
      {Boolean(saved.data?.length) && (
        <div>
          <h3 className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
            Previously imported
          </h3>
          <div className="divide-y divide-border">
            {saved.data.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <a
                    href={`https://open.spotify.com/playlist/${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm hover:underline"
                  >
                    {p.name}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Last imported {new Date(p.imported_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!connected || busy}
                  onClick={() => void importIds([p.id])}
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Import new songs
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      {progress && (
        <p role="status" className="text-sm">
          {progress}
        </p>
      )}
      {busy && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => abort.current?.abort()}
        >
          <X className="mr-2 h-3 w-3" />
          Stop after current save
        </Button>
      )}
      {reports.length > 0 && (
        <ul
          aria-live="polite"
          className="space-y-2 text-sm text-muted-foreground"
        >
          {reports.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
