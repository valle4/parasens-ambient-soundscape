import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { musicClient } from "@/lib/music/api";
import type { PortalFile } from "@/lib/portal/api";
import { portalFiles } from "@/lib/portal/files";
export default function PrivateFile({ file }: { file: PortalFile }) {
  const [open, setOpen] = useState(false);
  const url = useQuery({
    queryKey: ["portal-file-url", file.id],
    enabled: open,
    staleTime: 240000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (file.provider === "dropbox") return (await portalFiles<{ link: string }>({ action: "download", fileId: file.id })).link;
      const { data, error } = await musicClient()
        .storage.from("portal-releases")
        .createSignedUrl(file.path, 300);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  const audio =
    file.kind === "stereo" ||
    (file.kind === "stems" && !file.name.toLowerCase().endsWith(".zip"));
  return (
    <div className="space-y-3 border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="min-w-0 break-all text-xs">
          {file.name}{" "}
          <span className="text-muted-foreground">
            · {(file.size / 1048576).toFixed(1)} MB
          </span>
        </span>
        <button
          className="text-xs underline"
          onClick={() => {
            setOpen(true);
            if (url.isStale) void url.refetch();
          }}
        >
          {audio ? "Listen / download" : "Open file"}
        </button>
      </div>
      {open && url.isPending && (
        <p className="text-xs" role="status">
          Opening file…
        </p>
      )}
      {open && url.isError && (
        <p role="alert" className="text-xs">
          Could not open the file.{" "}
          <button className="underline" onClick={() => url.refetch()}>
            Retry
          </button>
        </p>
      )}
      {open && url.data && (
        <div className="space-y-3">
          {audio && (
            <audio
              controls
              preload="metadata"
              src={url.data}
              className="w-full"
            />
          )}
          <a
            className="text-xs underline"
            href={url.data}
            target="_blank"
            rel="noreferrer"
          >
            Download {file.name}
          </a>
        </div>
      )}
    </div>
  );
}
