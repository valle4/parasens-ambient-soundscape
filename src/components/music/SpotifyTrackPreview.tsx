import { useEffect, useRef, useState } from "react";
import {
  loadSpotifyEmbedApi,
  type SpotifyEmbedController,
} from "@/lib/music/spotify-embed";

export default function SpotifyTrackPreview({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Starting preview…");
  const [nativePlayer, setNativePlayer] = useState(false);

  useEffect(() => {
    let disposed = false;
    let controller: SpotifyEmbedController | undefined;
    let playbackTimer: number | undefined;
    const host = container.current!;
    const element = document.createElement("div");
    host.appendChild(element);
    const fallback = () => {
      if (disposed) return;
      setStatus("Press play in Spotify below to listen.");
    };
    const useNativePlayer = () => {
      if (disposed) return;
      disposed = true;
      clearTimeout(readyTimer);
      clearTimeout(playbackTimer);
      controller?.pause();
      controller?.destroy();
      controller = undefined;
      host.replaceChildren();
      setNativePlayer(true);
      setStatus("Press play in Spotify below to listen.");
    };
    // Give a slow first load time to finish before replacing it with the fallback.
    const readyTimer = window.setTimeout(useNativePlayer, 30_000);

    void loadSpotifyEmbedApi()
      .then((api) => {
        if (disposed) return;
        api.createController(
          element,
          { uri: `spotify:track:${id}`, width: "100%", height: 152 },
          (created) => {
            if (disposed) {
              created.destroy();
              return;
            }
            controller = created;
            const iframe = host.querySelector("iframe");
            if (iframe) {
              iframe.title = title;
              // Spotify defaults to lazy loading. This player is opened by a
              // click inside an animated, scrollable list and should load now.
              iframe.loading = "eager";
            }
            created.addListener("ready", () => {
              if (disposed) return;
              clearTimeout(readyTimer);
              playbackTimer = window.setTimeout(fallback, 4_000);
              // The row click requests playback as soon as Spotify is ready.
              created.play();
            });
            created.addListener("playback_update", ({ data }) => {
              if (disposed) return;
              if (!data.isPaused && !data.isBuffering) {
                clearTimeout(playbackTimer);
                setStatus("Playing preview");
              } else if (data.isPaused && data.position > 0) {
                setStatus("Preview paused. Press play in Spotify to continue.");
              }
            });
          },
        );
      })
      .catch(useNativePlayer);

    return () => {
      disposed = true;
      clearTimeout(readyTimer);
      clearTimeout(playbackTimer);
      controller?.pause();
      controller?.destroy();
      host.replaceChildren();
    };
  }, [id, title]);

  return (
    <div>
      <p role="status" className="text-center text-sm text-muted-foreground mb-3">
        {status}
      </p>
      <div
        ref={container}
        className="min-h-[152px] overflow-hidden rounded-xl"
        hidden={nativePlayer}
      />
      {nativePlayer && (
        <iframe
          title={title}
          src={`https://open.spotify.com/embed/track/${id}?theme=0`}
          width="100%"
          height="152"
          className="rounded-xl border-0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      )}
    </div>
  );
}
