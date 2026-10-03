import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { dropboxFolderLink } from "@/lib/portal/dropbox-links";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SearchableSelect from "@/components/music/SearchableSelect";
import PrivateFile from "@/components/portal/PrivateFile";
import ExportSubmissions from "@/components/portal/ExportSubmissions";
import WorkbookStatus from "@/components/portal/WorkbookStatus";
import { LoadError } from "@/components/portal/PortalShell";
import {
  artistDirectory,
  releaseById,
  releaseFiles,
  releaseDiscussion,
  portalRpc,
  portalAdmin,
  statusLabels,
} from "@/lib/portal/api";
const actionLabels: Record<string, string> = {
  submitted: "Submitted",
  changes_returned: "Changes returned",
  artist_approved: "Artist approved",
  start_review: "Review started",
  request_changes: "Changes requested",
  accept: "Accepted",
  decline: "Declined",
  deliver: "Marked delivered",
};
export default function ReleaseDetail({
  id,
  admin,
}: {
  id: string;
  admin: boolean;
}) {
  const cache = useQueryClient();
  const [section, setSection] = useState("tracks");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [approvedArtist, setApprovedArtist] = useState("");
  const [artistName, setArtistName] = useState("");
  const release = useQuery({
    queryKey: ["portal-release", id],
    queryFn: () => releaseById(id),
    refetchOnWindowFocus: false,
  });
  const files = useQuery({
    queryKey: ["portal-files", id],
    queryFn: () => releaseFiles(id),
    refetchOnWindowFocus: false,
  });
  const discussion = useQuery({
    queryKey: ["portal-discussion", id, admin],
    queryFn: () => releaseDiscussion(id, admin),
    refetchOnWindowFocus: false,
  });
  const directory = useQuery({
    queryKey: ["portal-directory"],
    queryFn: artistDirectory,
  });
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["portal-release", id] }),
      cache.invalidateQueries({ queryKey: ["portal-releases"] }),
      cache.invalidateQueries({ queryKey: ["portal-discussion", id] }),
      cache.invalidateQueries({ queryKey: ["portal-directory"] }),
    ]);
  };
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (release.isPending)
    return (
      <p role="status" className="p-6">
        Loading submission…
      </p>
    );
  if (release.isError) return <LoadError retry={() => release.refetch()} />;
  const r = release.data;
  const artist = directory.data?.artists.find((a) => a.id === r.artist_id);
  const dropboxFolders = [...new Map((files.data ?? []).flatMap((file) => {
    const href = dropboxFolderLink(file, true);
    return href ? [[href, file.uploader_name || file.uploader_email || "Release folder"] as const] : [];
  })).entries()];
  const editable = r.status === "draft" || r.awaiting_changes;
  const pendingNotifications =
    discussion.data?.notifications.filter((n) => n.state !== "sent") ?? [];
  const sendNotifications = async () => {
    const result = await portalAdmin({ action: "notify", releaseId: id });
    if (result.failed)
      toast.warning("The review is saved. Some emails need attention in Messages.");
    else toast.success(result.message);
    await cache.invalidateQueries({ queryKey: ["portal-discussion", id] });
  };
  return (
    <article className="min-w-0 space-y-5 border border-border p-4 md:p-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">
              {artist?.name || r.suggested_artist || "Artist to be confirmed"}
            </p>
            <h2 className="mt-1 break-words font-display text-2xl">{r.title}</h2>
          </div>
          <span className="border border-border px-3 py-2 text-xs">
            {statusLabels[r.status]}
          </span>
        </div>
        {r.awaiting_changes && (
          <p className="mt-3 text-sm">Awaiting artist changes</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          {r.content.releaseType} · {r.content.tracks?.length ?? 0} {(r.content.tracks?.length ?? 0) === 1 ? "track" : "tracks"} ·{" "}
          Updated {new Date(r.updated_at).toLocaleDateString()}
        </p>
        {editable && (
          <Link
            className="mt-4 inline-block border border-border px-4 py-2 text-xs"
            to={`/portal/releases/new?draft=${id}`}
          >
            {r.awaiting_changes ? "Make requested changes" : "Continue draft"}
          </Link>
        )}
        {admin && dropboxFolders.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {dropboxFolders.map(([href, uploader]) => <a key={href} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-border px-3 py-2 text-sm hover:border-foreground">
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              {dropboxFolders.length === 1 ? "Open release in Dropbox" : `Dropbox · ${uploader}`}
            </a>)}
          </div>
        )}
      </header>
      <Tabs value={section} onValueChange={setSection} className="min-w-0">
        <TabsList aria-label="Submission sections" className="h-auto w-full flex-wrap justify-start gap-x-5 gap-y-1 rounded-none border-b border-border bg-transparent p-0">
          {[
            ["tracks", "Tracks & files", r.content.tracks?.length ?? 0],
            ["info", "Release info", null],
            ["messages", "Messages", discussion.data?.messages.length ?? 0],
            ...(admin ? [["notes", "Admin notes", discussion.data?.notes.length ?? 0]] : []),
            ["history", "History", discussion.data?.events.length ?? 0],
          ].map(([value, label, count]) => (
            <TabsTrigger key={value} value={String(value)} className="gap-2 rounded-none border-b-2 border-transparent px-0 py-3 text-sm data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {label}{typeof count === "number" && count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="tracks" forceMount className="mt-5 min-w-0 space-y-5 data-[state=inactive]:hidden">
          <section aria-label="Tracks and downloads" className="space-y-3">
            <h3 className="text-sm font-medium">Listen & download</h3>
            {files.isPending && <p role="status" className="text-xs text-muted-foreground">Loading files…</p>}
            {files.isError && <LoadError retry={() => files.refetch()} />}
            {r.content.tracks?.map((track, index) => {
              const uploaded = files.data?.filter((file) => file.track_id === track.id && file.uploaded) ?? [];
              const stereo = uploaded.filter((file) => file.kind === "stereo");
              const stems = uploaded.filter((file) => file.kind === "stems");
              return <section key={track.id} aria-label={track.title || `Track ${index + 1}`} className="min-w-0 border border-border px-4 pt-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="min-w-0 break-words font-display text-lg"><span className="mr-2 text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>{track.title || "Untitled track"}</h4>
                  <span className="text-xs capitalize text-muted-foreground">{track.stereoStatus || (track.audioDelivery === "both" ? "Stereo + stems" : track.audioDelivery)}</span>
                </div>
                {track.composers && <p className="mt-1 break-words text-xs text-muted-foreground">Composers: {track.composers}</p>}
                {track.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{track.notes}</p>}
                <div className="mt-2 divide-y divide-border">
                  {stereo.map((file) => <PrivateFile key={file.id} file={file} showDropbox={admin} />)}
                  {files.isSuccess && stereo.length === 0 && <p className="py-3 text-xs text-muted-foreground">Stereo not uploaded</p>}
                  {stems.map((file) => <PrivateFile key={file.id} file={file} showDropbox={admin} />)}
                  {files.isSuccess && stems.length === 0 && ["both", "stems"].includes(track.audioDelivery) && <p className="py-3 text-xs text-muted-foreground">Stems not uploaded</p>}
                </div>
              </section>;
            })}
            {!r.content.tracks?.length && <p className="text-xs text-muted-foreground">No tracks in this release yet.</p>}
            {files.data?.some((file) => file.kind === "artwork" && file.uploaded) && <details className="border-b border-border py-3">
              <summary className="cursor-pointer text-sm">Artwork files</summary>
              {files.data.filter((file) => file.kind === "artwork" && file.uploaded).map((file) => <PrivateFile key={file.id} file={file} showDropbox={admin} />)}
            </details>}
          </section>
        </TabsContent>
        <TabsContent value="info" forceMount className="mt-5 min-w-0 space-y-5 data-[state=inactive]:hidden">
          <section>
            <h3 className="text-sm font-medium">Release info</h3>
            <div className="mt-4 space-y-4">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                {[
                  ["Submitted by", [r.uploader_name, r.uploader_email].filter(Boolean).join(" — ")],
                  ["Label", r.content.label],
                  ["Genre", r.content.genre],
                  ["Playlist / brief", r.content.playlistBrief],
                  ["Notes", r.content.generalNotes],
                  ["Artwork direction", r.content.artworkInspiration],
                ]
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
                      <dd className="whitespace-pre-wrap break-words">{value}</dd>
                    </div>
                  ))}
              </dl>
              <div className="space-y-3 border-t border-border pt-4">
                <h4 className="text-sm font-medium">Release workbook</h4>
                {admin && <ExportSubmissions release={id} label="Export release to Excel" />}
                <WorkbookStatus releaseId={id} />
              </div>
            </div>
          </section>
          {admin && !r.artist_id && (
            <details className="border-t border-border pt-4">
              <summary className="cursor-pointer text-sm font-medium">Artist name needs approval</summary>
              <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                {r.suggested_artist
                  ? `Suggested: ${r.suggested_artist}`
                  : "The artist asked PARASENS to choose a name."}{" "}
                Approving also assigns the submitting account to this act.
              </p>
              <SearchableSelect
                label="Approved artist"
                value={approvedArtist}
                onValueChange={setApprovedArtist}
                options={[
                  { value: "", label: "Choose an existing artist" },
                  ...(directory.data?.artists ?? []).map((a) => ({
                    value: a.id,
                    label: a.name,
                  })),
                ]}
              />
              <Button
                variant="outline"
                disabled={busy || !approvedArtist}
                onClick={() =>
                  run(async () => {
                    await portalRpc("portal_approve_artist", {
                      p_release: id,
                      p_artist: approvedArtist,
                    });
                    toast.success("Artist approved and assigned.");
                  })
                }
              >
                Assign selected artist
              </Button>
              <div className="flex flex-wrap gap-2">
                <Input
                  aria-label="Approved new artist name"
                  placeholder={r.suggested_artist || "New artist name"}
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  className="min-w-44 flex-1"
                />
                <Button
                  disabled={busy || !(artistName || r.suggested_artist).trim()}
                  onClick={() =>
                    run(async () => {
                      const created = await portalRpc<string>(
                        "portal_save_artist",
                        { p_name: (artistName || r.suggested_artist).trim() },
                      );
                      setApprovedArtist(created);
                      await portalRpc("portal_approve_artist", {
                        p_release: id,
                        p_artist: created,
                      });
                      toast.success("Artist created and assigned.");
                    })
                  }
                >
                  Create & assign
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Labels and genre tags can be edited under Artists.
              </p>
              </div>
            </details>
          )}
        </TabsContent>
        <TabsContent value="messages" forceMount className="mt-5 min-w-0 space-y-5 data-[state=inactive]:hidden">
          {admin && pendingNotifications.length > 0 && (
            <section className="space-y-3 border border-border p-4">
              <h3 className="text-sm">Email delivery</h3>
              {pendingNotifications.map((n) => (
                <p key={n.id} className="break-words text-xs text-muted-foreground">
                  {n.recipient}: {n.state}
                  {n.error ? ` — ${n.error}` : ""}
                </p>
              ))}
              <Button
                size="sm"
                variant="outline"
                disabled={
                  busy || pendingNotifications.every((n) => n.state === "uncertain")
                }
                onClick={() => run(sendNotifications)}
              >
                Retry pending emails
              </Button>
            </section>
          )}
          {discussion.isError && <LoadError retry={() => discussion.refetch()} />}
          <section>
            <h3 className="text-sm font-medium">Messages with {admin ? "the artist" : "PARASENS"}</h3>
            <div className="mt-4 space-y-4">
            {discussion.isPending && <p role="status" className="text-sm text-muted-foreground">Loading messages…</p>}
            {discussion.isSuccess && !discussion.data.messages.length && <p className="text-sm text-muted-foreground">No messages yet.</p>}
            {discussion.data?.messages.map((m) => (
              <div key={m.id} className="border-l border-border pl-3">
                <p className="text-[10px] text-muted-foreground">
                  {m.author_role === "admin" ? "PARASENS" : "Artist"} ·{" "}
                  {new Date(m.created_at).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                  {m.body}
                </p>
              </div>
            ))}
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await portalRpc("portal_add_message", {
                    p_release: id,
                    p_body: message,
                  });
                  setMessage("");
                });
              }}
            >
              <textarea
                aria-label="Message to artist or administrator"
                placeholder={
                  admin ? "Message visible to the artist…" : "Message PARASENS…"
                }
                maxLength={10000}
                required
                rows={3}
                className="w-full border border-border bg-background p-3 text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button variant="outline" disabled={busy || !message.trim()}>
                Post message
              </Button>
              <p className="text-xs text-muted-foreground">
                Messages stay in the portal. Only declines and requests for changes
                trigger review emails.
              </p>
            </form>
            </div>
          </section>
        </TabsContent>
        {admin && (
        <TabsContent value="notes" forceMount className="mt-5 min-w-0 space-y-5 data-[state=inactive]:hidden">
            <section>
            <h3 className="text-sm font-medium">Private admin notes</h3>
              <div className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Only administrators can see these notes.
              </p>
              {discussion.data?.notes.map((n) => (
                <p
                  key={n.id}
                  className="whitespace-pre-wrap break-words border-l border-border pl-3 text-sm"
                >
                  {n.body}
                </p>
              ))}
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await portalRpc("portal_add_message", {
                      p_release: id,
                      p_body: note,
                      p_private: true,
                    });
                    setNote("");
                  });
                }}
              >
                <textarea
                  aria-label="Private admin note"
                  placeholder="Private note…"
                  maxLength={10000}
                  required
                  rows={3}
                  className="w-full border border-border bg-background p-3 text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button variant="outline" disabled={busy || !note.trim()}>
                  Save private note
                </Button>
              </form>
              </div>
            </section>
        </TabsContent>
        )}
        <TabsContent value="history" forceMount className="mt-5 min-w-0 space-y-5 data-[state=inactive]:hidden">
          <section>
            <h3 className="text-sm font-medium">Review history</h3>
            <div className="mt-4 space-y-3">
            {discussion.isPending && <p role="status" className="text-sm text-muted-foreground">Loading history…</p>}
            {discussion.isSuccess && !discussion.data.events.length && <p className="text-sm text-muted-foreground">No review activity yet.</p>}
            {discussion.data?.events.map((event) => (
              <div key={event.id} className="text-sm">
                <p>
                  {actionLabels[event.action] ?? event.action}{" "}
                  <span className="text-xs text-muted-foreground">
                    · {new Date(event.created_at).toLocaleString()}
                  </span>
                </p>
                {event.message && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                    {event.message}
                  </p>
                )}
              </div>
            ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>
      {admin && ["new", "in_review", "accepted"].includes(r.status) && (
        <section aria-label="Review decision" className="space-y-4 border-t border-border pt-5">
          <h3 className="text-sm font-medium">Review decision</h3>
          {!r.artist_id && <p className="text-sm text-muted-foreground">Approve the artist in <button type="button" className="underline text-foreground" onClick={() => setSection("info")}>Release info</button> before accepting.</p>}
          <div className="flex flex-wrap gap-2">
            {r.status === "new" && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await portalRpc("portal_review", {
                      p_id: id,
                      p_revision: r.revision,
                      p_action: "start_review",
                      p_message: "",
                      p_event: crypto.randomUUID(),
                    });
                  })
                }
              >
                Start review
              </Button>
            )}
            {r.status === "accepted" ? (
              <Button disabled={busy} onClick={() => setDecision("deliver")}>
                Mark delivered
              </Button>
            ) : (
              <>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => setDecision("request_changes")}
                >
                  Request changes
                </Button>
                <Button
                  disabled={busy || !r.artist_id}
                  onClick={() => setDecision("accept")}
                >
                  Accept
                </Button>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => setDecision("decline")}
                >
                  Decline
                </Button>
              </>
            )}
          </div>
          {decision && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await portalRpc("portal_review", {
                    p_id: id,
                    p_revision: r.revision,
                    p_action: decision,
                    p_message: reason,
                    p_event: crypto.randomUUID(),
                  });
                  const email = ["decline", "request_changes"].includes(
                    decision,
                  );
                  setDecision("");
                  setReason("");
                  toast.success("Review saved.");
                  if (email) {
                    try {
                      await sendNotifications();
                    } catch {
                      toast.warning(
                        "Review saved; email delivery is pending. Retry in Messages.",
                      );
                    }
                  }
                });
              }}
            >
              <label className="block text-sm">
                {decision === "deliver"
                  ? "Confirm this music has been sent to the label."
                  : decision === "decline"
                    ? "Decline reason — visible to the artist"
                    : decision === "request_changes"
                      ? "What should the artist change?"
                      : "Message to the artist (optional)"}
                {decision !== "deliver" && (
                  <textarea
                    required={["decline", "request_changes"].includes(decision)}
                    maxLength={10000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="mt-2 w-full border border-border bg-background p-3"
                  />
                )}
              </label>
              <div className="flex gap-3">
                <Button disabled={busy}>
                  {busy
                    ? "Saving…"
                    : `Confirm ${decision === "deliver" ? "delivery" : decision === "accept" ? "acceptance" : decision === "decline" ? "decline" : "changes request"}`}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDecision("");
                    setReason("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </section>
      )}
    </article>
  );
}
