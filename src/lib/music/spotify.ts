import { normalisePlaylistItems, type ImportTrack } from "./catalogue";
const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const tokenKey = "parasens-spotify-token";
const flowKey = "parasens-spotify-flow";
export const spotifyConfigured = Boolean(clientId);
const redirectUri = () =>
  `${window.location.origin}/portal/music/spotify/callback`;
type Token = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  userId: string;
};
export function disconnectSpotify() {
  sessionStorage.removeItem(tokenKey);
  sessionStorage.removeItem(flowKey);
}
function readToken(userId: string): Token | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(tokenKey) ?? "null");
    return t?.userId === userId ? t : null;
  } catch {
    return null;
  }
}
export const spotifyConnected = (userId: string) => Boolean(readToken(userId));
const random = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
export async function connectSpotify(userId: string) {
  if (!clientId) throw new Error("Spotify setup is still needed.");
  completion = undefined;
  const verifier = random(),
    state = random();
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  sessionStorage.setItem(
    flowKey,
    JSON.stringify({ verifier, state, userId, created: Date.now() }),
  );
  const query = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri(),
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope: "playlist-read-private playlist-read-collaborative",
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${query}`);
}
async function exchange(
  body: URLSearchParams,
  userId: string,
  refreshToken?: string,
): Promise<Token> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    disconnectSpotify();
    throw new Error(
      "Spotify connection expired or was declined. Please connect again.",
    );
  }
  const data = await response.json();
  const token = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
    userId,
  };
  sessionStorage.setItem(tokenKey, JSON.stringify(token));
  return token;
}
let completion: Promise<void> | undefined;
export function finishSpotify(userId: string): Promise<void> {
  // React StrictMode can run effects twice. Redeem each one-time code once.
  if (completion) return completion;
  completion = (async () => {
    const query = new URLSearchParams(window.location.search);
    const raw = sessionStorage.getItem(flowKey);
    sessionStorage.removeItem(flowKey);
    window.history.replaceState({}, "", window.location.pathname);
    if (query.has("error"))
      throw new Error(
        "Spotify connection was cancelled. You can try again from the library.",
      );
    const flow = raw ? JSON.parse(raw) : null;
    if (
      !flow ||
      flow.userId !== userId ||
      flow.state !== query.get("state") ||
      Date.now() - flow.created > 600_000 ||
      !query.get("code")
    )
      throw new Error(
        "This Spotify connection link has expired. Please start again.",
      );
    await exchange(
      new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        code: query.get("code")!,
        redirect_uri: redirectUri(),
        code_verifier: flow.verifier,
      }),
      userId,
    );
  })();
  return completion;
}
async function accessToken(userId: string): Promise<string> {
  let token = readToken(userId);
  if (!token) throw new Error("Connect Spotify first.");
  if (token.expires_at < Date.now() + 60_000)
    token = await exchange(
      new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
      }),
      userId,
      token.refresh_token,
    );
  return token.access_token;
}
export async function spotifyGet<T>(
  path: string,
  userId: string,
  signal?: AbortSignal,
): Promise<T> {
  // Only send the token to Spotify, including API-supplied pagination URLs.
  const url = new URL(path, "https://api.spotify.com/v1/");
  if (
    url.origin !== "https://api.spotify.com" ||
    !url.pathname.startsWith("/v1/")
  )
    throw new Error("Invalid Spotify request.");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${await accessToken(userId)}` },
      signal,
    });
    if (response.status === 401) {
      disconnectSpotify();
      throw new Error("Please reconnect Spotify and retry the import.");
    }
    if (response.status === 403)
      throw new Error(
        "Spotify could not read this playlist. Use a playlist you own or collaborate on, and check your app’s allowed users.",
      );
    if (response.status === 429) {
      const seconds = Math.max(
        1,
        Number(response.headers.get("Retry-After")) || 5,
      );
      if (seconds > 10 || attempt === 2)
        throw new Error(
          `Spotify is busy. Try again in ${seconds} seconds; retrying will not duplicate songs.`,
        );
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, seconds * 1000);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new DOMException("Cancelled", "AbortError"));
          },
          { once: true },
        );
      });
      continue;
    }
    if (!response.ok)
      throw new Error(
        response.status === 404
          ? "Spotify playlist not found."
          : "Spotify could not complete the request. Please try again.",
      );
    return response.json();
  }
  throw new Error("Spotify is busy. Please try again.");
}
export type SpotifyPlaylist = {
  id: string;
  name: string;
  owner?: { display_name?: string };
  items?: { total: number };
  tracks?: { total: number };
};
export async function listSpotifyPlaylists(
  userId: string,
  signal?: AbortSignal,
) {
  const playlists: SpotifyPlaylist[] = [];
  let next: string | null = "me/playlists?limit=50";
  while (next) {
    const page: { items: SpotifyPlaylist[]; next: string | null } =
      await spotifyGet(next, userId, signal);
    playlists.push(...page.items.filter(Boolean));
    next = page.next;
  }
  return playlists;
}
export async function readSpotifyPlaylist(
  id: string,
  userId: string,
  progress: (count: number) => void,
  signal?: AbortSignal,
): Promise<{ name: string; tracks: ImportTrack[]; skipped: number }> {
  const info = await spotifyGet<SpotifyPlaylist>(
    `playlists/${id}`,
    userId,
    signal,
  );
  const items: unknown[] = [];
  let next: string | null = `playlists/${id}/items?limit=50`;
  while (next) {
    const page: { items: unknown[]; next: string | null } = await spotifyGet(
      next,
      userId,
      signal,
    );
    items.push(...page.items);
    progress(items.length);
    next = page.next;
  }
  return { name: info.name, ...normalisePlaylistItems(items) };
}
