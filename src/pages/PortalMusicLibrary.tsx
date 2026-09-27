import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronUp,
  GripVertical,
  ListMusic,
  Music2,
  Play,
  Plus,
  Search,
  Tag,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import SearchableSelect from "@/components/music/SearchableSelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PortalSignOut from "@/components/portal/PortalSignOut";
import PlaylistImports from "@/components/music/PlaylistImports";
import InlineTrackPlayer from "@/components/music/InlineTrackPlayer";
import CategoryManager from "@/components/music/CategoryManager";
import { AdminNavigation } from "@/components/portal/PortalShell";
import { usePortalAuth } from "@/contexts/portal-auth";
import { useMusicAdmin } from "@/hooks/useMusicAdmin";
import {
  loadCatalogue,
  loadPlaylists,
  musicClient,
  musicRpc,
} from "@/lib/music/api";
import {
  categoryLabel,
  sortTracks,
  tracksInScope,
  type MusicSort,
  type MusicSortDirection,
  type MusicStatus,
  type MusicTrack,
} from "@/lib/music/catalogue";
import { useSongDrag } from "@/hooks/useSongDrag";

const pageSize = 50;

export default function PortalMusicLibrary() {
  const { user } = usePortalAuth();
  const role = useMusicAdmin();
  const cache = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "library";
  const library = useQuery({
    queryKey: ["music-library", user.id],
    queryFn: () => loadCatalogue(),
    refetchOnWindowFocus: false,
  });
  const playlists = useQuery({
    queryKey: ["music-playlists", user.id],
    queryFn: loadPlaylists,
  });
  const [status, setStatus] = useState<MusicStatus>("draft");
  const [scope, setScope] = useState("all");
  const [sort, setSort] = useState<MusicSort>("manual");
  const [sortDirection, setSortDirection] = useState<MusicSortDirection>("asc");
  const sortColumn = (column: MusicSort) => {
    setSortDirection(
      sort === column && sortDirection === "asc" ? "desc" : "asc",
    );
    setSort(column);
  };
  const [search, setSearch] = useState("");
  const [untagged, setUntagged] = useState(false);
  const [playlist, setPlaylist] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [tagCounts, setTagCounts] = useState<Map<string, number>>(new Map());
  const [tagEdits, setTagEdits] = useState<Map<string, boolean>>(new Map());
  const [tagSearch, setTagSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [moving, setMoving] = useState<MusicTrack | null>(null);
  const [position, setPosition] = useState(1);
  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    tableRef.current?.scrollTo({ top: 0 });
    setPlaying(null);
  }, [
    page,
    status,
    scope,
    search,
    untagged,
    playlist,
    tab,
    sort,
    sortDirection,
  ]);
  const membership = useQuery({
    queryKey: ["music-playlist-members", playlist, user.id],
    enabled: Boolean(playlist),
    queryFn: async () => {
      const ids: string[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await musicClient()
          .from("music_playlist_tracks")
          .select("track_id")
          .eq("playlist_id", playlist)
          .order("track_id")
          .range(offset, offset + 499);
        if (error) throw error;
        ids.push(...data.map((t) => t.track_id));
        if (data.length < 500) return new Set(ids);
      }
    },
  });
  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [status, scope, search, untagged, playlist, sort, sortDirection]);
  const data = library.data;
  const tagsByTrack = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const tag of data?.tags ?? [])
      map.set(tag.track_id, [
        ...(map.get(tag.track_id) ?? []),
        tag.category_id,
      ]);
    return map;
  }, [data]);
  const ordered = useMemo(
    () =>
      data ? tracksInScope(data, scope).filter((t) => t.status === status) : [],
    [data, scope, status],
  );
  const filtered = useMemo(
    () =>
      ordered.filter(
        (t) =>
          (!search ||
            `${t.title} ${t.artist}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (!untagged || !tagsByTrack.has(t.id)) &&
          (!playlist || membership.data?.has(t.id)),
      ),
    [ordered, search, untagged, tagsByTrack, playlist, membership.data],
  );
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const sorted = useMemo(
    () =>
      sortTracks(
        filtered,
        sort,
        data?.categories ?? [],
        data?.tags ?? [],
        sortDirection,
      ),
    [filtered, sort, sortDirection, data?.categories, data?.tags],
  );
  const visible = sorted.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const canOrder =
    status === "published" &&
    sort === "manual" &&
    !search &&
    !untagged &&
    !playlist;
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["music-library"] }),
      cache.invalidateQueries({ queryKey: ["public-music"] }),
      cache.invalidateQueries({ queryKey: ["music-playlist-members"] }),
    ]);
  };
  const mutate = async (fn: () => Promise<unknown>, message: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await refresh();
      toast.success(message);
      setSelected(new Set());
      return true;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  const changeStatus = (next: MusicStatus) =>
    void mutate(
      () =>
        musicRpc("music_set_status", { p_ids: [...selected], p_status: next }),
      next === "published"
        ? "Selected songs are now published."
        : next === "archived"
          ? "Songs archived. Future imports will keep them archived."
          : "Songs moved to drafts.",
    );
  const move = async (id: string, to: number) => {
    if (
      await mutate(
        () =>
          musicRpc("music_move_track", {
            p_id: id,
            p_scope: scope,
            p_position: to,
          }),
        "Order saved.",
      )
    )
      setMoving(null);
  };
  const { dragging, dropTarget, startDrag, cancelDrag } = useSongDrag({
    container: tableRef,
    ids: ordered.map((track) => track.id),
    enabled: canOrder && !busy && tab === "library",
    onMove: (id, to) => {
      void move(id, to);
    },
  });
  useEffect(() => {
    cancelDrag();
  }, [page, scope, tab, cancelDrag]);
  const toggle = (id: string) =>
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const startTagging = (id?: string) => {
    const targets = id && !selected.has(id) ? new Set([id]) : selected;
    setSelected(targets);
    const counts = new Map<string, number>();
    for (const trackId of targets)
      for (const categoryId of tagsByTrack.get(trackId) ?? [])
        counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
    setTagCounts(counts);
    setTagEdits(new Map());
    setTagSearch("");
    setNewName("");
    setNewParent("");
    setTagging(true);
  };
  const changeTag = (id: string, checked: boolean) =>
    setTagEdits((old) => {
      const next = new Map(old);
      const count = tagCounts.get(id) ?? 0;
      if (checked ? count === selected.size : count === 0) next.delete(id);
      else next.set(id, checked);
      return next;
    });
  const saveTags = async () => {
    if (
      await mutate(
        () =>
          musicRpc("music_edit_track_genres", {
            p_ids: [...selected],
            p_add_categories: [...tagEdits]
              .filter(([, checked]) => checked)
              .map(([id]) => id),
            p_remove_categories: [...tagEdits]
              .filter(([, checked]) => !checked)
              .map(([id]) => id),
          }),
        "Tags saved.",
      )
    )
      setTagging(false);
  };
  const createTag = async () => {
    if (busy || !newName.trim()) return;
    setBusy(true);
    try {
      const id = await musicRpc<string>("music_save_category", {
        p_name: newName,
        p_parent: newParent || null,
      });
      await refresh();
      changeTag(id, true);
      setNewName("");
      toast.success("Category created and selected.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not create category.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="relative min-h-screen bg-background px-5 py-7 text-foreground md:px-12 lg:px-20">
      <header className="flex flex-wrap items-center justify-between gap-5 border-b border-border pb-6">
        <Link to="/" className="font-display font-semibold tracking-[0.18em]">
          PARASENS
        </Link>
        <div className="flex items-center gap-6">
          <Link
            to="/portal/admin/submissions"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Artist portal
          </Link>
          <span className="border border-border px-2 py-1 text-[10px] uppercase tracking-widest">
            Administrator
          </span>
          <PortalSignOut />
        </div>
      </header>
      <AdminNavigation />
      <section className="mx-auto max-w-7xl py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[.3em] text-muted-foreground">
              Your sound, curated
            </p>
            <h1 className="mt-4 font-display text-4xl tracking-tight md:text-5xl">
              Website music
            </h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Import, organise and choose what the world hears.
            </p>
          </div>
          <Button onClick={() => setParams({ tab: "import" })}>
            <Plus className="mr-2 h-4 w-4" />
            Import songs
          </Button>
        </div>
        {data && (
          <div className="my-9 grid grid-cols-3 gap-3">
            {(["draft", "published", "archived"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setParams({ tab: "library" });
                }}
                className={`border p-4 text-left md:p-5 ${status === s && tab === "library" ? "border-foreground/60 bg-foreground/[.03]" : "border-border"}`}
              >
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {s === "draft"
                    ? "Drafts"
                    : s === "published"
                      ? "Published"
                      : "Archived"}
                </span>
                <strong className="mt-2 block font-display text-3xl font-medium">
                  {data.tracks.filter((t) => t.status === s).length}
                </strong>
              </button>
            ))}
          </div>
        )}
        <nav
          aria-label="Music library"
          className="my-8 flex gap-7 overflow-x-auto border-b border-border"
        >
          {[
            ["library", "Songs"],
            ["import", "Playlists"],
            ["categories", "Genres"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setParams({ tab: key })}
              className={`whitespace-nowrap border-b-2 pb-4 text-xs uppercase tracking-widest ${tab === key ? "border-foreground" : "border-transparent text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </nav>
        {library.isPending && (
          <p role="status" className="py-20 text-center text-muted-foreground">
            Loading your library…
          </p>
        )}
        {library.isError && (
          <div role="alert" className="border border-border p-8">
            <h2 className="font-display text-xl">
              The library could not be loaded
            </h2>
            <p className="my-4 text-sm text-muted-foreground">
              Please retry. If this is the first visit, the music database needs
              to be set up.
            </p>
            <Button onClick={() => library.refetch()}>Retry</Button>
          </div>
        )}
        {tab === "import" && <PlaylistImports onChange={refresh} />}
        {tab === "categories" && data && (
          <CategoryManager categories={data.categories} onChange={refresh} />
        )}

        {tab === "library" && data && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-0 basis-full lg:min-w-56 lg:flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  aria-label="Search songs or artists"
                  placeholder="Search songs or artists…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-none pl-10"
                />
              </div>
              <SearchableSelect
                label="Genre or subgenre"
                value={scope}
                onValueChange={setScope}
                searchPlaceholder="Search genres…"
                className="sm:w-56"
                options={[
                  { value: "all", label: "All genres" },
                  ...data.categories.map((c) => ({
                    value: c.id,
                    label: categoryLabel(c, data.categories),
                  })),
                ]}
              />
              <SearchableSelect
                label="Source playlist"
                value={playlist}
                onValueChange={setPlaylist}
                searchPlaceholder="Search playlists…"
                className="sm:w-56"
                options={[
                  { value: "", label: "All playlists" },
                  ...(playlists.data ?? []).map((p) => ({
                    value: p.id,
                    label: p.name,
                  })),
                ]}
              />
              <div className="flex h-10 items-center gap-3 px-1 sm:px-2">
                <Checkbox
                  id="music-untagged-only"
                  checked={untagged}
                  onCheckedChange={(checked) => setUntagged(checked === true)}
                  className="rounded-none border-muted-foreground/50"
                />
                <label
                  htmlFor="music-untagged-only"
                  className="whitespace-nowrap text-sm text-muted-foreground"
                >
                  Untagged only
                </label>
              </div>
            </div>
            <div className="my-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <p>
                {filtered.length} songs
                {status === "published"
                  ? canOrder
                    ? " · Drag the grip beside a song to reorder. Drop to save."
                    : sort !== "manual"
                      ? " · Click Order to return to your saved sequence and drag songs."
                      : " · Clear search, playlist and untagged filters to reorder."
                  : status === "archived"
                    ? " · Archived songs stay archived when playlists are imported again."
                    : " · Tag songs, then publish when ready."}
              </p>
              <button
                className="underline"
                disabled={busy}
                onClick={() => void library.refetch()}
              >
                Refresh library
              </button>
            </div>
            {selected.size > 0 && (
              <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-3 border border-foreground/30 bg-card p-4 shadow-lg">
                <span className="mr-3 text-sm">{selected.size} selected</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => startTagging()}
                >
                  <Tag className="mr-2 h-3 w-3" />
                  Tag songs
                </Button>
                {status !== "published" && (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => changeStatus("published")}
                  >
                    <Upload className="mr-2 h-3 w-3" />
                    Publish selected
                  </Button>
                )}
                {status !== "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => changeStatus("draft")}
                  >
                    {status === "archived"
                      ? "Restore to drafts"
                      : "Move to drafts"}
                  </Button>
                )}
                {status !== "archived" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => changeStatus("archived")}
                  >
                    <Archive className="mr-2 h-3 w-3" />
                    Archive
                  </Button>
                )}
                <button
                  className="ml-auto text-xs underline"
                  disabled={busy}
                  onClick={() => setSelected(new Set())}
                >
                  Clear selection
                </button>
              </div>
            )}
            {membership.isError && playlist && (
              <p role="alert" className="my-5">
                Could not load playlist songs.{" "}
                <button
                  className="underline"
                  onClick={() => membership.refetch()}
                >
                  Retry
                </button>
              </p>
            )}
            <div
              ref={tableRef}
              data-song-dragging={Boolean(dragging)}
              className="max-h-[65vh] overflow-auto border border-border"
            >
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-border bg-card text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="w-12 p-4">
                      <Checkbox
                        aria-label="Select songs on this page"
                        className="rounded-none border-muted-foreground/50"
                        disabled={busy || !visible.length}
                        checked={
                          visible.length > 0 &&
                          visible.every((t) => selected.has(t.id))
                            ? true
                            : visible.some((t) => selected.has(t.id))
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(checked) =>
                          setSelected((old) => {
                            const next = new Set(old);
                            for (const t of visible) {
                              if (checked === true) next.add(t.id);
                              else next.delete(t.id);
                            }
                            return next;
                          })
                        }
                      />
                    </th>
                    <th
                      scope="col"
                      className="w-24"
                      aria-sort={sort === "manual" ? "other" : "none"}
                    >
                      <button
                        type="button"
                        aria-label="Order: restore manual order"
                        title="Return to saved manual order"
                        onClick={() => {
                          setSort("manual");
                          setSortDirection("asc");
                        }}
                        className={`w-full py-4 text-left uppercase tracking-widest hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${sort === "manual" ? "text-foreground" : ""}`}
                      >
                        Order
                      </button>
                    </th>
                    {(
                      [
                        ["song", "Song"],
                        ["artist", "Artist"],
                        ["genre", "Genre"],
                      ] as const
                    ).map(([column, label]) => {
                      const active = sort === column;
                      const SortIcon = active
                        ? sortDirection === "asc"
                          ? ArrowUp
                          : ArrowDown
                        : ArrowUpDown;
                      const nextDirection =
                        active && sortDirection === "asc" ? "Z–A" : "A–Z";
                      return (
                        <th
                          key={column}
                          scope="col"
                          aria-sort={
                            active
                              ? sortDirection === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          <button
                            type="button"
                            aria-label={`${label}: sort ${nextDirection}`}
                            title={
                              column === "genre"
                                ? `Sort ${nextDirection} by first genre alphabetically; untagged songs last`
                                : `Sort ${nextDirection}`
                            }
                            onClick={() => sortColumn(column)}
                            className={`flex w-full items-center gap-2 py-4 pr-4 text-left uppercase tracking-widest hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${active ? "text-foreground" : ""}`}
                          >
                            {label}
                            <SortIcon
                              aria-hidden="true"
                              className={`h-3 w-3 ${active ? "" : "opacity-40"}`}
                            />
                          </button>
                        </th>
                      );
                    })}
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((track, index) => (
                    <Fragment key={track.id}>
                      <tr
                        className={`border-b border-border/70 transition-colors ${busy ? "" : "cursor-pointer"} ${selected.has(track.id) ? "bg-foreground/[.07] hover:bg-foreground/[.09]" : "hover:bg-foreground/[.035]"} ${dragging === track.id ? "opacity-40" : ""}`}
                        aria-selected={selected.has(track.id)}
                        onClick={(event) => {
                          // Keep nested controls independent, including the drag handle.
                          if (
                            busy ||
                            dragging ||
                            (event.target instanceof Element &&
                              event.target.closest(
                                "button, input, a, label, select, textarea, [role='checkbox']",
                              ))
                          )
                            return;
                          toggle(track.id);
                        }}
                        data-drop-edge={
                          dropTarget?.id === track.id
                            ? dropTarget.edge
                            : undefined
                        }
                        data-song-row={track.id}
                      >
                        <td className="p-4">
                          <Checkbox
                            aria-label={`Select ${track.title}`}
                            className="rounded-none border-muted-foreground/50"
                            checked={selected.has(track.id)}
                            disabled={busy}
                            onCheckedChange={() => toggle(track.id)}
                          />
                        </td>
                        <td>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {canOrder && (
                              <button
                                type="button"
                                data-song-drag-handle
                                disabled={busy}
                                aria-label={`Drag ${track.title} to reorder`}
                                title="Drag to reorder. Use the position button to move between pages."
                                onPointerDown={(e) =>
                                  startDrag(e, track.id, track.title)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setMoving(track);
                                    setPosition(
                                      currentPage * pageSize + index + 1,
                                    );
                                  }
                                }}
                                className="inline-flex h-9 w-9 shrink-0 touch-none select-none cursor-grab items-center justify-center rounded border border-border text-foreground/70 hover:bg-accent hover:text-foreground active:cursor-grabbing disabled:opacity-40"
                              >
                                <GripVertical className="h-5 w-5" />
                              </button>
                            )}
                            {currentPage * pageSize + index + 1}
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <p className="font-medium">{track.title}</p>
                        </td>
                        <td className="py-4 pr-4 text-muted-foreground">
                          {track.artist}
                        </td>
                        <td className="max-w-72 py-3 pr-3">
                          <button
                            disabled={busy}
                            className="flex flex-wrap gap-1.5 text-left"
                            aria-label={`Edit genres for ${track.title}`}
                            onClick={() => startTagging(track.id)}
                          >
                            {(tagsByTrack.get(track.id) ?? []).map((id) => {
                              const c = data.categories.find(
                                (c) => c.id === id,
                              );
                              return c ? (
                                <span
                                  key={id}
                                  className="border border-border px-2 py-1 text-[11px] text-muted-foreground"
                                >
                                  {categoryLabel(c, data.categories)}
                                </span>
                              ) : null;
                            })}
                            {!tagsByTrack.has(track.id) && (
                              <span className="border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">
                                + Add genre
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={
                                playing === track.id
                                  ? `Hide player for ${track.title}`
                                  : `Listen to ${track.title}`
                              }
                              aria-expanded={playing === track.id}
                              aria-controls={
                                playing === track.id
                                  ? `preview-${track.id}`
                                  : undefined
                              }
                              onClick={() =>
                                setPlaying((current) =>
                                  current === track.id ? null : track.id,
                                )
                              }
                            >
                              {playing === track.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            {canOrder && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={busy}
                                  aria-label={`Choose position for ${track.title}`}
                                  title="Choose an exact position, including on another page"
                                  onClick={() => {
                                    setMoving(track);
                                    setPosition(
                                      currentPage * pageSize + index + 1,
                                    );
                                  }}
                                >
                                  <ListMusic className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {playing === track.id && (
                        <tr className="border-b border-border bg-foreground/[.02]">
                          <td colSpan={6}>
                            <InlineTrackPlayer
                              id={track.id}
                              title={track.title}
                              onClose={() => setPlaying(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              {!visible.length && (
                <div className="py-16 text-center">
                  <Music2 className="mx-auto mb-4 h-7 w-7 text-muted-foreground" />
                  <p className="font-display text-lg">
                    {playlist && membership.isPending
                      ? "Loading playlist songs…"
                      : "No songs here yet"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {search || scope !== "all" || untagged || playlist
                      ? "Try changing your filters."
                      : status === "draft"
                        ? "Import a Spotify playlist to start curating."
                        : status === "archived"
                          ? "Songs you archive will appear here."
                          : "Publish tagged drafts to add songs to the website."}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
              <div>
                <button
                  disabled={busy || !filtered.length}
                  className="underline"
                  onClick={() =>
                    setSelected(new Set(filtered.map((t) => t.id)))
                  }
                >
                  Select all {filtered.length} matching songs
                </button>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!currentPage}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span>
                  Page {currentPage + 1} of {lastPage + 1}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= lastPage}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
      <Dialog
        open={tagging}
        onOpenChange={(v) => {
          if (!busy) setTagging(v);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Tag {selected.size} song{selected.size === 1 ? "" : "s"}
            </DialogTitle>
            <DialogDescription>
              Check a genre to add it, or uncheck it to remove it.
              {selected.size > 1 &&
                " A dash means only some selected songs have that genre. Unchanged genres stay as they are."}
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Search available genres"
            placeholder="Search genres and subgenres…"
            value={tagSearch}
            onChange={(event) => setTagSearch(event.target.value)}
            className="rounded-none"
          />
          <div className="max-h-60 space-y-3 overflow-auto border border-border p-4">
            {data?.categories
              .filter((c) =>
                categoryLabel(c, data.categories)
                  .toLowerCase()
                  .includes(tagSearch.trim().toLowerCase()),
              )
              .map((c) => (
                <label key={c.id} className="flex items-center gap-3 text-sm">
                  <Checkbox
                    className="rounded-none border-muted-foreground/50"
                    disabled={busy}
                    checked={
                      tagEdits.get(c.id) ??
                      (!tagCounts.has(c.id)
                        ? false
                        : tagCounts.get(c.id) === selected.size
                          ? true
                          : "indeterminate")
                    }
                    onCheckedChange={(checked) =>
                      changeTag(c.id, checked === true)
                    }
                  />
                  {categoryLabel(c, data.categories)}
                </label>
              ))}
          </div>
          {data &&
            !data.categories.some((c) =>
              categoryLabel(c, data.categories)
                .toLowerCase()
                .includes(tagSearch.trim().toLowerCase()),
            ) && (
              <p className="text-sm text-muted-foreground">
                No matching genres. You can create one below.
              </p>
            )}
          <details className="border border-border p-3">
            <summary className="cursor-pointer text-sm">
              + Create genre or subgenre
            </summary>
            <div className="mt-3 space-y-3">
              <Input
                aria-label="New category name"
                placeholder="Category name"
                value={newName}
                maxLength={80}
                onChange={(e) => setNewName(e.target.value)}
                disabled={busy}
              />
              <SearchableSelect
                label="New category parent"
                value={newParent}
                onValueChange={setNewParent}
                disabled={busy}
                searchPlaceholder="Search parent genres…"
                options={[
                  { value: "", label: "New top-level genre" },
                  ...(data?.categories ?? [])
                    .filter((c) => !c.parent_id)
                    .map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              <Button
                variant="outline"
                disabled={busy || !newName.trim()}
                onClick={() => void createTag()}
              >
                Create & select
              </Button>
            </div>
          </details>
          <Button
            disabled={busy || !tagEdits.size}
            onClick={() => void saveTags()}
          >
            {busy ? "Saving…" : "Apply tags"}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(moving)}
        onOpenChange={(v) => {
          if (!v && !busy) setMoving(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to position</DialogTitle>
            <DialogDescription>
              Choose where “{moving?.title}” appears in{" "}
              {scope === "all"
                ? "All"
                : data?.categories.find((c) => c.id === scope)?.name}
              . Other views keep their own order.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void move(moving.id, position);
            }}
          >
            <Input
              aria-label="Position"
              type="number"
              min={1}
              max={ordered.length}
              required
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
            />
            <Button disabled={busy}>Save position</Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
