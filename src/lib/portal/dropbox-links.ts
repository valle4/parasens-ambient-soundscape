import type { PortalFile } from "./api";

// Use the stored web path, which includes any Dropbox app-folder prefix.
// Never guess a folder from a release title that may have changed since upload.
export function dropboxFolderLink(file: PortalFile, releaseFolder = false) {
  if (file.provider !== "dropbox" || !file.uploaded || !file.dropbox_web_path?.startsWith("/")) return null;
  const parts = file.dropbox_web_path.split("/");
  parts.pop();
  if (releaseFolder) parts.pop(); // Audio, Stems or Artwork
  if (parts.length < 2) return null;
  return `https://www.dropbox.com/home${parts.map(encodeURIComponent).join("/")}`;
}
