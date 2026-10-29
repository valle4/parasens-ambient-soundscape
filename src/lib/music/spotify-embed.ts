type PlaybackEvent = {
  data: { isPaused: boolean; isBuffering: boolean; position: number };
};

export type SpotifyEmbedController = {
  play: () => void;
  pause: () => void;
  destroy: () => void;
  addListener: {
    (event: "ready", listener: () => void): void;
    (event: "playback_update", listener: (event: PlaybackEvent) => void): void;
  };
};

type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { uri: string; width: string; height: number },
    callback: (controller: SpotifyEmbedController) => void,
  ) => void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  }
}

let apiPromise: Promise<SpotifyIframeApi> | undefined;

// Share the script, but create only the player the listener actually opens.
export function loadSpotifyEmbedApi(): Promise<SpotifyIframeApi> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const previousReady = window.onSpotifyIframeApiReady;
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      window.onSpotifyIframeApiReady = previousReady;
      apiPromise = undefined;
      reject(new Error("Spotify player controls could not load."));
    };
    const timeout = window.setTimeout(fail, 10_000);
    window.onSpotifyIframeApiReady = (api) => {
      clearTimeout(timeout);
      script.onerror = null;
      resolve(api);
      previousReady?.(api);
    };
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return apiPromise;
}
