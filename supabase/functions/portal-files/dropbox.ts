export type DropboxConfig = { appKey: string; appSecret: string; refreshToken: string; expectedEmail: string };
export type DropboxMetadata = { ".tag": string; id: string; size: number; path_lower: string; rev: string };
export function dropboxClient(config: DropboxConfig, transport: typeof fetch = fetch) {
  let token: string | undefined;
  const signal = AbortSignal.timeout(90000);
  async function accessToken() {
    if (token) return token;
    const response = await transport("https://api.dropboxapi.com/oauth2/token", { method: "POST", signal,
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: config.refreshToken, client_id: config.appKey, client_secret: config.appSecret }) });
    if (!response.ok) throw new Error("Dropbox connection expired. Reconnect the destination account.");
    const auth = await response.json();
    if (typeof auth.access_token !== "string") throw new Error("Dropbox did not return a valid connection.");
    const check = await transport("https://api.dropboxapi.com/2/users/get_current_account", { method: "POST", signal, headers: { Authorization: `Bearer ${auth.access_token}` } });
    if (!check.ok || (await check.json()).email?.toLowerCase() !== config.expectedEmail.toLowerCase()) throw new Error("The connected Dropbox account does not match the configured destination.");
    token = auth.access_token;
    return token;
  }
  async function rpc<T>(route: string, body: unknown): Promise<T> {
    const response = await transport(`https://api.dropboxapi.com/2/${route}`, { method: "POST", signal, headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(response.status === 429 ? "Dropbox is busy. Please retry shortly." : "Dropbox could not complete the file request. Please retry.");
    return response.json();
  }
  return {
    verify: accessToken,
    metadata: (path: string) => rpc<DropboxMetadata>("files/get_metadata", { path }),
    uploadLink: (path: string) => rpc<{ link: string }>("files/get_temporary_upload_link", { duration: 900, commit_info: { path, mode: "add", autorename: false, strict_conflict: true, mute: true } }),
    downloadLink: (id: string) => rpc<{ link: string }>("files/get_temporary_link", { path: id }),
    async workbook(path: string, bytes: Uint8Array) {
      // This exact generated filename belongs to the portal; user-uploaded names include a UUID.
      const args = JSON.stringify({ path, mode: "overwrite", autorename: false, mute: true }).replace(/[\u007f-\uffff]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
      const response = await transport("https://content.dropboxapi.com/2/files/upload", { method: "POST", signal, headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/octet-stream", "Dropbox-API-Arg": args }, body: bytes as BodyInit });
      if (!response.ok) throw new Error("The release is saved, but its Dropbox workbook needs retrying.");
      return response.json() as Promise<DropboxMetadata>;
    },
  };
}

export function verifyDropboxFile(file: { path: string; size: number }, metadata: DropboxMetadata) {
  if (metadata[".tag"] !== "file" || metadata.size !== file.size || metadata.path_lower !== file.path.toLowerCase() || !metadata.id.startsWith("id:")) throw new Error("The Dropbox upload could not be verified. Remove the incomplete entry and try again.");
}
