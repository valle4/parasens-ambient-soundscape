import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Upload } from "lucide-react";
import PortalShell, { LoadError } from "@/components/portal/PortalShell";
import PrivateFile from "@/components/portal/PrivateFile";
import WorkbookStatus from "@/components/portal/WorkbookStatus";
import { portalFiles, syncReleaseWorkbook } from "@/lib/portal/files";
import SearchableSelect from "@/components/music/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  artistDirectory,
  releaseById,
  releaseFiles,
  portalRpc,
  uploadReleaseFile,
  type Release,
  type ReleaseContent,
  type TrackDraft,
  type PortalFile,
} from "@/lib/portal/api";
import { categoryLabel } from "@/lib/music/catalogue";
const emptyTrack = (): TrackDraft => ({
  id: crypto.randomUUID(),
  title: "",
  composers: "",
  notes: "",
  audioDelivery: "",
  stereoStatus: "",
});
const blank = (): ReleaseContent => ({
  releaseTitle: "",
  releaseType: "Single",
  parasensChoosesTitle: false,
  parasensChoosesArtist: false,
  label: "",
  genre: "",
  playlistBrief: "",
  generalNotes: "",
  artworkInspiration: "",
  tracks: [emptyTrack()],
});
const labelClass = "block space-y-2 text-xs text-muted-foreground";
const areaClass =
  "w-full border border-border bg-background p-3 text-sm text-foreground";
const steps = ["Release information", "Artwork", "Tracks", "Review"];
export default function PortalNewRelease() {
  const [params, setParams] = useSearchParams();
  const initialId = params.get("draft");
  const [id, setId] = useState(() => initialId || crypto.randomUUID());
  const navigate = useNavigate();
  const cache = useQueryClient();
  const directory = useQuery({
    queryKey: ["portal-directory"],
    queryFn: artistDirectory,
  });
  const existing = useQuery({
    queryKey: ["portal-release", id],
    enabled: Boolean(initialId),
    queryFn: () => releaseById(id),
    refetchOnWindowFocus: false,
  });
  const [saved, setSaved] = useState<Release | null>(null);
  const savedRef = useRef<Release | null>(null);
  const hydrated = useRef(false);
  const [content, setContent] = useState<ReleaseContent>(blank);
  const [artist, setArtist] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [dirty, setDirty] = useState(false);
  const [artwork, setArtwork] = useState(false);
  const previousDraft = useRef(initialId);
  useEffect(() => {
    if (initialId === previousDraft.current) return;
    previousDraft.current = initialId;
    if (initialId === id) return;
    setId(initialId || crypto.randomUUID());
    savedRef.current = null;
    setSaved(null);
    hydrated.current = false;
    setContent(blank());
    setArtist("");
    setSuggestion("");
    setStep(0);
    setArtwork(false);
    setDirty(false);
  }, [initialId, id]);
  const files = useQuery({
    queryKey: ["portal-files", id],
    enabled: Boolean(saved || initialId),
    queryFn: () => releaseFiles(id),
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (existing.data && !hydrated.current) {
      hydrated.current = true;
      savedRef.current = existing.data;
      setSaved(existing.data);
      setContent({ ...blank(), ...existing.data.content });
      setArtist(
        existing.data.artist_id ||
          (existing.data.content.parasensChoosesArtist
            ? "parasens"
            : "suggest"),
      );
      setSuggestion(existing.data.suggested_artist);
      setArtwork(Boolean(existing.data.content.artworkInspiration));
    }
  }, [existing.data]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty || busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const leave = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? (event.target.closest("a[href]") as HTMLAnchorElement | null)
          : null;
      if (
        !link ||
        (!dirty && !busy) ||
        link.origin !== window.location.origin ||
        !link.pathname.startsWith("/portal")
      )
        return;
      if (
        !window.confirm(
          busy
            ? "An upload or save is in progress. Leave this page?"
            : "Leave this page? Unsaved changes will be lost.",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty, busy]);
  const setField = <K extends keyof ReleaseContent>(
    key: K,
    value: ReleaseContent[K],
  ) => {
    setContent((old) => ({ ...old, [key]: value }));
    setDirty(true);
  };
  const setTrack = <K extends keyof TrackDraft>(
    trackId: string,
    key: K,
    value: TrackDraft[K],
  ) =>
    setField(
      "tracks",
      content.tracks.map((t) =>
        t.id === trackId ? { ...t, [key]: value } : t,
      ),
    );
  const save = async () => {
    const result = await portalRpc<Release>("portal_save_release", {
      p_id: id,
      p_revision: savedRef.current?.revision ?? 0,
      p_artist:
        artist && artist !== "suggest" && artist !== "parasens" ? artist : null,
      p_suggestion: artist === "suggest" ? suggestion : "",
      p_content: { ...content, parasensChoosesArtist: artist === "parasens" },
    });
    savedRef.current = result;
    setSaved(result);
    hydrated.current = true;
    setDirty(false);
    cache.setQueryData(["portal-release", id], result);
    if (!initialId) setParams({ draft: id }, { replace: true });
    await cache.invalidateQueries({ queryKey: ["portal-releases"] });
    return result;
  };
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save. Please retry.",
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  };
  const upload = (
    trackId: string | null,
    kind: PortalFile["kind"],
    selected: FileList | null,
  ) => {
    if (!selected?.length) return;
    const batch = Array.from(selected);
    void run(async () => {
      await save();
      try {
        for (let i = 0; i < batch.length; i++) {
          setProgress(
            `Uploading ${i + 1} of ${batch.length}: ${batch[i].name}`,
          );
          await uploadReleaseFile(id, trackId, kind, batch[i]);
        }
        toast.success("Files uploaded.");
      } finally {
        await files.refetch();
      }
    });
  };
  const chooseArtist = (value: string) => {
    setArtist(value);
    setDirty(true);
    const chosen = directory.data?.artists.find((a) => a.id === value);
    if (chosen) {
      const label =
        directory.data?.labels.find((l) => l.id === chosen.label_id)?.name ??
        "";
      const genre =
        directory.data?.links
          .filter((g) => g.artist_id === value)
          .map((g) =>
            directory.data?.genres.find((c) => c.id === g.category_id),
          )
          .filter(Boolean)
          .map((c) => categoryLabel(c!, directory.data!.genres))
          .join(", ") ?? "";
      setContent((old) => ({ ...old, label, genre }));
    }
  };
  const fileSection = (trackId: string | null, kind: PortalFile["kind"]) => (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center gap-3 border border-dashed border-border p-5 text-xs hover:border-foreground">
        <Upload aria-hidden="true" className="h-4 w-4" />
        <span>
          {kind === "artwork"
            ? "Choose artwork or references"
            : kind === "stereo"
              ? "Choose stereo mix"
              : "Choose stems or ZIP"}
          <span className="mt-1 block text-muted-foreground">
            {kind === "artwork"
              ? "JPG, PNG or PDF"
              : kind === "stereo"
                ? "WAV, AIFF or FLAC"
                : "WAV, AIFF, FLAC or ZIP"}
            {" · Up to 50 MB per file"}
          </span>
        </span>
        <input
          className="sr-only"
          aria-label={`${kind} files${trackId ? ` for ${content.tracks.find((t) => t.id === trackId)?.title || "track"}` : ""}`}
          type="file"
          accept={
            kind === "artwork"
              ? ".jpg,.jpeg,.png,.pdf"
              : kind === "stereo"
                ? ".wav,.aif,.aiff,.flac"
                : ".wav,.aif,.aiff,.flac,.zip"
          }
          multiple={kind !== "stereo"}
          onChange={(e) => {
            upload(trackId, kind, e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {files.data
        ?.filter((f) => f.track_id === trackId && f.kind === kind)
        .map((f) => (
          <div key={f.id} className="space-y-2">
            {f.uploaded ? (
              <PrivateFile file={f} />
            ) : (
              <p role="alert" className="text-xs">
                {f.name}: upload not completed. Remove this entry and upload it
                again.
              </p>
            )}
            {!f.uploaded && f.provider === "dropbox" && <button type="button" className="text-xs underline" disabled={busy} onClick={() => run(async () => {
              await portalFiles({ action: "finish", fileId: f.id });
              await files.refetch();
              void syncReleaseWorkbook(id).catch(() => undefined);
              toast.success("Upload confirmed.");
            })}>Retry confirmation</button>}
            <button
              type="button"
              className="text-xs underline"
              onClick={() =>
                run(async () => {
                  await portalRpc("portal_remove_file", { p_id: f.id });
                  await files.refetch();
                  void syncReleaseWorkbook(id).catch(() => undefined);
                })
              }
            >
              Remove {f.name}
            </button>
          </div>
        ))}
    </div>
  );
  if (initialId && existing.isPending)
    return (
      <PortalShell title="Upload music">
        <p role="status">Loading draft…</p>
      </PortalShell>
    );
  if (existing.isError)
    return (
      <PortalShell title="Upload music">
        <LoadError retry={() => existing.refetch()} />
      </PortalShell>
    );
  if (saved && saved.status !== "draft" && !saved.awaiting_changes)
    return (
      <PortalShell title="Release submitted">
        <Link to={`/portal/releases/${id}`} className="underline">
          View this release and its review
        </Link>
      </PortalShell>
    );
  return (
    <PortalShell
      title={
        saved?.awaiting_changes
          ? "Update your release"
          : "Tell us about the music."
      }
      description="Save a draft at any time. Review the release before submitting it to PARASENS."
    >
      {directory.isError && <LoadError retry={() => directory.refetch()} />}
      {saved && <WorkbookStatus releaseId={id} />}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const current = await save();
            if (step < 3) {
              setStep(step + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              await portalRpc("portal_submit_release", {
                p_id: id,
                p_revision: current.revision,
              });
              await cache.invalidateQueries({ queryKey: ["portal-releases"] });
              await cache.invalidateQueries({
                queryKey: ["portal-release", id],
              });
              toast.success("Release submitted.");
              navigate(`/portal/releases/${id}`);
            }
          });
        }}
      >
        <fieldset disabled={busy} className="space-y-8">
          <legend className="sr-only">Release upload</legend>
          <nav
            aria-label="Upload progress"
            className="grid grid-cols-4 border-y border-border"
          >
            {steps.map((label, index) => (
              <button
                type="button"
                key={label}
                aria-current={step === index ? "step" : undefined}
                className={`border-r border-border px-2 py-5 text-left text-[10px] last:border-0 sm:px-5 ${step === index ? "bg-foreground/[.05] text-foreground" : "text-muted-foreground"}`}
                onClick={() => setStep(index)}
              >
                <span className="block">0{index + 1}</span>
                <span className="mt-2 block">{label}</span>
              </button>
            ))}
          </nav>
          {step === 0 && (
            <section className="grid gap-7 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Primary artist</p>
                <SearchableSelect
                  label="Primary artist"
                  value={artist}
                  onValueChange={chooseArtist}
                  disabled={Boolean(saved && saved.status !== "draft")}
                  options={[
                    { value: "", label: "Choose an artist" },
                    ...(directory.data?.artists ?? []).map((a) => ({
                      value: a.id,
                      label: a.name,
                    })),
                    { value: "suggest", label: "Suggest a new artist name" },
                    { value: "parasens", label: "Ask PARASENS to decide" },
                  ]}
                />
                {artist === "suggest" && (
                  <Input
                    aria-label="Suggested artist name"
                    required
                    maxLength={120}
                    placeholder="Suggested artist name"
                    value={suggestion}
                    onChange={(e) => {
                      setSuggestion(e.target.value);
                      setDirty(true);
                    }}
                  />
                )}
                {artist === "parasens" && (
                  <p className="text-xs text-muted-foreground">
                    PARASENS will choose and approve an artist name during
                    review.
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <label className={labelClass}>
                  <span>Release title</span>
                  <Input
                    required={!content.parasensChoosesTitle}
                    disabled={content.parasensChoosesTitle}
                    maxLength={500}
                    value={content.releaseTitle}
                    onChange={(e) => setField("releaseTitle", e.target.value)}
                    placeholder={
                      content.parasensChoosesTitle
                        ? "PARASENS will decide"
                        : "Title of the release"
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={content.parasensChoosesTitle}
                    onCheckedChange={(v) =>
                      setField("parasensChoosesTitle", v === true)
                    }
                  />
                  Ask PARASENS to decide the title
                </label>
              </div>
              <label className={labelClass}>
                <span>Label</span>
                <Input
                  value={content.label}
                  onChange={(e) => setField("label", e.target.value)}
                  placeholder="Label for this release"
                />
              </label>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Release type</p>
                <SearchableSelect
                  label="Release type"
                  value={content.releaseType}
                  onValueChange={(v) =>
                    setField("releaseType", v as ReleaseContent["releaseType"])
                  }
                  options={["Single", "EP", "Album"].map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </div>
              <label className={labelClass}>
                <span>Genre</span>
                <Input
                  value={content.genre}
                  onChange={(e) => setField("genre", e.target.value)}
                  placeholder="e.g. Ambient"
                />
              </label>
              <label className={labelClass}>
                <span>Playlist / Brief</span>
                <Input
                  value={content.playlistBrief}
                  onChange={(e) => setField("playlistBrief", e.target.value)}
                  placeholder="Optional playlist or brief"
                />
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                <span>General notes</span>
                <textarea
                  rows={3}
                  maxLength={10000}
                  className={areaClass}
                  value={content.generalNotes}
                  onChange={(e) => setField("generalNotes", e.target.value)}
                />
              </label>
            </section>
          )}
          {step === 1 && (
            <section className="space-y-6">
              <h2 className="font-display text-2xl">Artwork</h2>
              <p className="text-sm text-muted-foreground">
                You do not need to provide artwork.
              </p>
              <label className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={
                    artwork ||
                    Boolean(files.data?.some((f) => f.kind === "artwork"))
                  }
                  onCheckedChange={(v) => setArtwork(v === true)}
                />
                I want to submit artwork or visual references
              </label>
              {(artwork || files.data?.some((f) => f.kind === "artwork")) && (
                <div className="grid gap-6 md:grid-cols-2">
                  {fileSection(null, "artwork")}
                  <label className={labelClass}>
                    <span>Artwork inspiration</span>
                    <textarea
                      rows={5}
                      maxLength={10000}
                      className={areaClass}
                      value={content.artworkInspiration}
                      onChange={(e) =>
                        setField("artworkInspiration", e.target.value)
                      }
                      placeholder="Visual direction or reference links"
                    />
                  </label>
                </div>
              )}
            </section>
          )}
          {step === 2 && (
            <section className="space-y-6">
              <h2 className="font-display text-2xl">Tracks</h2>
              {content.tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="space-y-6 border border-border p-5 md:p-7"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm">Track {index + 1}</h3>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        aria-label={`Move track ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() => {
                          const next = [...content.tracks];
                          [next[index - 1], next[index]] = [
                            next[index],
                            next[index - 1],
                          ];
                          setField("tracks", next);
                        }}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move track ${index + 1} down`}
                        disabled={index === content.tracks.length - 1}
                        onClick={() => {
                          const next = [...content.tracks];
                          [next[index + 1], next[index]] = [
                            next[index],
                            next[index + 1],
                          ];
                          setField("tracks", next);
                        }}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      {content.tracks.length > 1 && (
                        <button
                          type="button"
                          className="text-xs underline"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Remove this track from the release?",
                              )
                            )
                              setField(
                                "tracks",
                                content.tracks.filter((t) => t.id !== track.id),
                              );
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <label className={labelClass}>
                      <span>Track title</span>
                      <Input
                        required
                        value={track.title}
                        maxLength={500}
                        placeholder="Title"
                        onChange={(e) =>
                          setTrack(track.id, "title", e.target.value)
                        }
                      />
                    </label>
                    <label className={labelClass}>
                      <span>Songwriters / composers</span>
                      <Input
                        required
                        value={track.composers}
                        maxLength={2000}
                        placeholder="Full legal name / PRO Pseudonym"
                        onChange={(e) =>
                          setTrack(track.id, "composers", e.target.value)
                        }
                      />
                    </label>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        What files are you providing?
                      </p>
                      <SearchableSelect
                        label={`Audio delivery for track ${index + 1}`}
                        value={track.audioDelivery}
                        onValueChange={(v) =>
                          setTrack(
                            track.id,
                            "audioDelivery",
                            v as TrackDraft["audioDelivery"],
                          )
                        }
                        options={[
                          { value: "", label: "Choose audio delivery" },
                          { value: "stems", label: "Audio stems only" },
                          { value: "stereo", label: "Stereo mix only" },
                          { value: "both", label: "Stereo mix and stems" },
                        ]}
                      />
                    </div>
                    {track.audioDelivery !== "stems" && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Stereo mix status
                        </p>
                        <SearchableSelect
                          label={`Stereo mix status for track ${index + 1}`}
                          value={track.stereoStatus}
                          onValueChange={(v) =>
                            setTrack(
                              track.id,
                              "stereoStatus",
                              v as TrackDraft["stereoStatus"],
                            )
                          }
                          options={[
                            { value: "", label: "Choose mix status" },
                            { value: "rough", label: "Rough / reference mix" },
                            { value: "mixed", label: "Mixed — not mastered" },
                            { value: "mastered", label: "Mixed and mastered" },
                          ]}
                        />
                      </div>
                    )}
                    {fileSection(track.id, "stereo")}
                    {fileSection(track.id, "stems")}
                    <label className={`${labelClass} md:col-span-2`}>
                      <span>Track-specific notes</span>
                      <textarea
                        rows={3}
                        maxLength={10000}
                        className={areaClass}
                        value={track.notes}
                        onChange={(e) =>
                          setTrack(track.id, "notes", e.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={content.tracks.length >= 100}
                onClick={() =>
                  setField("tracks", [...content.tracks, emptyTrack()])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add another track
              </Button>
            </section>
          )}
          {step === 3 && (
            <section className="space-y-5">
              <h2 className="font-display text-2xl">Review your release</h2>
              <div className="border border-border p-6">
                <h3 className="font-display text-xl">
                  {content.parasensChoosesTitle
                    ? "Title to be chosen by PARASENS"
                    : content.releaseTitle || "Untitled release"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {directory.data?.artists.find((a) => a.id === artist)?.name ||
                    (artist === "suggest"
                      ? suggestion
                      : "Artist to be confirmed")}{" "}
                  · {content.releaseType}
                </p>
                <div className="mt-5 space-y-4">
                  {content.tracks.map((track, index) => (
                    <div key={track.id}>
                      <p className="text-sm">
                        {index + 1}. {track.title || "Untitled track"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {track.composers || "Songwriter names missing"} ·{" "}
                        {files.data?.filter(
                          (f) => f.track_id === track.id && f.uploaded,
                        ).length ?? 0}{" "}
                        uploaded files
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                After submitting, you can follow the review and exchange
                messages in your release page. Editing opens again when changes
                are requested.
              </p>
            </section>
          )}
          <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-border pt-6">
            <div role="status" className="text-xs text-muted-foreground">
              {progress ||
                (dirty
                  ? "Unsaved changes"
                  : saved
                    ? "Draft saved"
                    : "Not saved yet")}
            </div>
            <div className="flex flex-wrap gap-3">
              {step > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  run(async () => {
                    await save();
                    toast.success("Draft saved.");
                  })
                }
              >
                Save draft
              </Button>
              <Button type="submit">
                {busy
                  ? "Working…"
                  : step === 3
                    ? saved?.awaiting_changes
                      ? "Return for review"
                      : "Submit release"
                    : `Continue to ${steps[step + 1].toLowerCase()}`}
              </Button>
            </div>
          </footer>
        </fieldset>
      </form>
      <Link
        to="/portal/dashboard"
        className="mt-7 inline-block text-xs underline"
      >
        Return to portal
      </Link>
    </PortalShell>
  );
}
