import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, Play } from "lucide-react";
import { musicClient } from "@/lib/music/api";
import type { PortalFile } from "@/lib/portal/api";
import { portalFiles } from "@/lib/portal/files";
import { dropboxFolderLink } from "@/lib/portal/dropbox-links";
import { Button } from "@/components/ui/button";

export default function PrivateFile({ file, showDropbox = false }: { file: PortalFile; showDropbox?: boolean }) {
  const cache = useQueryClient();
  const [source, setSource] = useState<string | null>(null);
  const [busy, setBusy] = useState<"play" | "download" | null>(null);
  const [error, setError] = useState("");
  const audio = file.kind === "stereo" || (file.kind === "stems" && /\.(wav|aif|aiff|mp3|m4a|flac|ogg)$/i.test(file.name));
  const kind = file.kind === "stereo" ? "stereo" : file.kind === "stems" ? "stems" : "artwork";
  const folder = showDropbox ? dropboxFolderLink(file) : null;
  const getUrl = () => cache.fetchQuery({
    queryKey: ["portal-file-url", file.id],
    staleTime: 240000,
    queryFn: async () => {
      if (file.provider === "dropbox") return (await portalFiles<{ link: string }>({ action: "download", fileId: file.id })).link;
      const { data, error } = await musicClient().storage.from("portal-releases").createSignedUrl(file.path, 300);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  const open = async (action: "play" | "download") => {
    if (busy) return;
    setBusy(action);
    setError("");
    try {
      const url = await getUrl();
      if (action === "play") {
        setSource(url);
      } else {
        // Cross-origin download attributes alone can open audio in another tab.
        // Download the authorized bytes so the file is saved with its real name.
        const response = await fetch(url);
        if (!response.ok) throw new Error("Download failed. Please try again.");
        const localUrl = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = localUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(localUrl), 60000);
      }
    } catch {
      setError(action === "play" ? "Could not load audio. Try Play again." : "Could not download this file. Try Download again.");
      await cache.invalidateQueries({ queryKey: ["portal-file-url", file.id] });
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="min-w-0 space-y-3 py-3" aria-label={file.name}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 basis-40">
          <p className="text-xs font-medium capitalize">{kind}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{file.name} · {(file.size / 1048576).toFixed(1)} MB</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {audio && !source && <Button size="sm" variant="outline" disabled={busy !== null} aria-label={`Play ${file.name}`} onClick={() => void open("play")}>
            <Play aria-hidden="true" className="h-3 w-3" />{busy === "play" ? "Loading…" : "Play"}
          </Button>}
          <Button size="sm" variant="outline" disabled={busy !== null} aria-label={`Download ${file.name}`} onClick={() => void open("download")}>
            <Download aria-hidden="true" className="h-3 w-3" />{busy === "download" ? "Downloading…" : `Download ${kind}`}
          </Button>
          {folder && <a href={folder} target="_blank" rel="noreferrer" aria-label={`Open Dropbox folder for ${file.name}`} className="inline-flex items-center gap-1 px-2 py-2 text-xs underline underline-offset-4">
            Dropbox <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </a>}
        </div>
      </div>
      {error && <p role="alert" className="text-xs">{error}</p>}
      {source && <audio
        aria-label={`Listen to ${file.name}`}
        controls autoPlay preload="metadata" src={source} className="h-10 w-full [color-scheme:dark]"
        onPlay={(event) => {
          document.querySelectorAll("audio").forEach((player) => { if (player !== event.currentTarget) player.pause(); });
        }}
        onError={() => {
          setSource(null);
          setError("This audio could not be played. Try Play again or download the file.");
          void cache.invalidateQueries({ queryKey: ["portal-file-url", file.id] });
        }}
      />}
    </div>
  );
}
