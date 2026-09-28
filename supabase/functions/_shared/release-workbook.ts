import ExcelJS from "exceljs";

type RecordRow = Record<string, unknown>;
export type ExportData = {
  generated_at: string;
  releases: RecordRow[];
  files: RecordRow[];
  messages: RecordRow[];
  events: RecordRow[];
  notes: RecordRow[];
};
const statuses: Record<string, string> = { draft: "Draft", new: "New", in_review: "In Review", accepted: "Accepted", declined: "Declined", delivered: "Delivered" };
const actions: Record<string, string> = { submitted: "Submitted", changes_returned: "Changes returned", artist_approved: "Artist approved", start_review: "Review started", request_changes: "Changes requested", accept: "Accepted", decline: "Declined", deliver: "Marked delivered" };
const date = (value: unknown) => value ? new Date(String(value)) : null;
const text = (value: unknown) => value == null ? "" : String(value);

export async function releaseWorkbook(data: ExportData, includePrivate = false): Promise<Uint8Array> {
  const book = new ExcelJS.Workbook();
  book.creator = "PARASENS";
  book.created = date(data.generated_at) || new Date();
  const fullText: unknown[][] = [];
  const add = (name: string, headers: string[], rows: unknown[][]) => {
    const sheet = book.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }], properties: { defaultRowHeight: 30 } });
    sheet.columns = headers.map((header) => ({ header, width: /notes|message|brief|direction|composers/i.test(header) ? 48 : /reference|email|path|link|filename/i.test(header) ? 40 : 25 }));
    rows.forEach((row, index) => sheet.addRow(row.map((value, col) => {
      if (typeof value === "string" && value.length > 32767) {
        for (let start = 0; start < value.length; start += 30000) fullText.push([name, index + 2, headers[col], start / 30000 + 1, value.slice(start, start + 30000)]);
        return value.slice(0, 32000) + "\n[Continued in Full text sheet]";
      }
      return value;
    })));
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: headers.length } };
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.font = { name: "Aptos", size: 11, color: { argb: rowNumber === 1 ? "FFFFFFFF" : "FF202824" }, bold: rowNumber === 1 };
        cell.alignment = { vertical: "top", wrapText: true };
        if (cell.value instanceof Date) cell.numFmt = "yyyy-mm-dd hh:mm:ss";
        if (rowNumber === 1 || rowNumber % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber === 1 ? "FF24463C" : "FFF0F5F2" } };
      });
      row.height = rowNumber === 1 ? 36 : Math.min(180, Math.max(30, ...row.values instanceof Array ? row.values.map(v => typeof v === "string" ? Math.ceil(v.length / 45) * 15 : 30) : [30]));
    });
    sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  };
  const releaseMap = new Map(data.releases.map(r => [r.id, r]));
  const trackMap = new Map<string, RecordRow>();
  const tracks: unknown[][] = [];
  add("Releases", ["Release reference", "Uploader name", "Uploader email", "Artist", "Suggested artist", "Release title", "Release type", "Parasens chooses title", "Parasens chooses artist", "Label", "Genre", "Playlist / brief", "General notes", "Artwork direction", "Status", "Awaiting changes", "Created (UTC)", "Submitted (UTC)", "Updated (UTC)", "Revision"], data.releases.map(r => {
    const c = (r.content || {}) as RecordRow;
    ((c.tracks || []) as RecordRow[]).forEach((t, i) => {
      trackMap.set(`${r.id}/${t.id}`, t);
      tracks.push([r.id, r.title, t.id, i + 1, t.title, t.composers, t.audioDelivery, t.stereoStatus, t.notes]);
    });
    return [r.id, r.uploader_name, r.uploader_email, r.artist_name, r.suggested_artist, r.title, c.releaseType, Boolean(c.parasensChoosesTitle), Boolean(c.parasensChoosesArtist), c.label, c.genre, c.playlistBrief, c.generalNotes, c.artworkInspiration, statuses[text(r.status)] || r.status, Boolean(r.awaiting_changes), date(r.created_at), date(r.submitted_at), date(r.updated_at), r.revision];
  }));
  add("Tracks", ["Release reference", "Release title", "Track reference", "Track number", "Track title", "Composers", "Audio delivery", "Audio readiness", "Track notes"], tracks);
  add("Files", ["Release reference", "Release title", "Track reference", "Track title", "File reference", "Filename", "Type", "Size (bytes)", "Upload complete", "Uploader name", "Uploader email", "Uploaded (UTC)", "Storage", "Path", "Dropbox link"], data.files.map(f => [f.release_id, releaseMap.get(f.release_id)?.title, f.track_id, trackMap.get(`${f.release_id}/${f.track_id}`)?.title, f.id, f.name, f.kind, Number(f.size), Boolean(f.uploaded), f.uploader_name ?? "Unknown (historical upload)", f.uploader_email, date(f.created_at), f.provider || "supabase", f.path, f.provider === "dropbox" && f.uploaded && f.dropbox_web_path ? `https://www.dropbox.com/home${text(f.dropbox_web_path).split("/").map(encodeURIComponent).join("/")}` : ""]));
  add("Review history", ["Release reference", "Release title", "Date (UTC)", "Action", "Message", "Reviewer reference"], data.events.map(e => [e.release_id, releaseMap.get(e.release_id)?.title, date(e.created_at), actions[text(e.action)] || e.action, e.message, e.actor_id]));
  add("Messages", ["Release reference", "Release title", "Date (UTC)", "Author role", "Author reference", "Message"], data.messages.map(m => [m.release_id, releaseMap.get(m.release_id)?.title, date(m.created_at), m.author_role, m.author_id, m.body]));
  if (includePrivate) add("Private admin notes", ["Release reference", "Release title", "Date (UTC)", "Author reference", "Note"], data.notes.map(n => [n.release_id, releaseMap.get(n.release_id)?.title, date(n.created_at), n.author_id, n.body]));
  add("About", ["Item", "Value"], [["Exported (UTC)", date(data.generated_at)], ["Release count", data.releases.length], ["Source", "PARASENS artist portal"], ["Updates", "This workbook is a snapshot. Make changes in the portal and export again."], ["Dropbox links", "Dropbox links require access to the destination Dropbox account. Portal users can open files in the portal."], ["Private notes", includePrivate ? "Included. For administrators only." : "Excluded."], ["Folder names", "Folders retain their original names after creation. Current names and status appear in this workbook."]]);
  if (fullText.length) add("Full text", ["Sheet", "Row", "Column", "Part", "Text"], [...fullText]);
  // Plain strings remain string cells, including values starting with =, +, -, or @.
  return new Uint8Array(await book.xlsx.writeBuffer());
}
