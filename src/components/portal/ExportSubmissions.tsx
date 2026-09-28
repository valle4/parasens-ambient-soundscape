import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportSubmissions } from "@/lib/portal/export";

export default function ExportSubmissions({ status = "all", artist, release, label = "Export to Excel" }: { status?: string; artist?: string; release?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  return <Button variant="outline" disabled={busy} onClick={async () => {
    setBusy(true);
    try { await exportSubmissions(status, artist, release); toast.success("Excel export downloaded."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not export. Please retry."); }
    finally { setBusy(false); }
  }}>{busy ? "Preparing Excel…" : label}</Button>;
}
