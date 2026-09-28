import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PortalShell, { LoadError } from "@/components/portal/PortalShell";
import ReleaseDetail from "@/components/portal/admin/ReleaseDetail";
import ExportSubmissions from "@/components/portal/ExportSubmissions";
import {
  releaseList,
  statusLabels,
  type ReleaseStatus,
} from "@/lib/portal/api";
import { Button } from "@/components/ui/button";
import SearchableSelect from "@/components/music/SearchableSelect";
export default function PortalSubmissions() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(0);
  const selected = params.get("release");
  const artist = params.get("artist") ?? undefined;
  const list = useQuery({
    queryKey: ["portal-releases", status, page, artist],
    queryFn: () => releaseList(status, page, artist),
    refetchOnWindowFocus: false,
  });
  return (
    <PortalShell
      title="Submissions"
      description="Listen, review and follow each release through to delivery."
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchableSelect
          label="Submission status"
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(0);
          }}
          className="sm:w-64"
          options={[
            { value: "pending", label: "Awaiting review" },
            { value: "changes", label: "Awaiting artist changes" },
            ...Object.entries(statusLabels).map(([value, label]) => ({
              value,
              label,
            })),
            { value: "all", label: "All submissions" },
          ]}
        />
        <ExportSubmissions status={status} artist={artist} label="Export this view" />
        <ExportSubmissions label="Export all submissions" />
        {artist && (
          <Button
            variant="ghost"
            onClick={() => {
              setParams({});
              setPage(0);
            }}
          >
            Clear artist filter
          </Button>
        )}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(260px,.7fr)_minmax(0,1.3fr)]">
        <aside className="min-w-0 lg:sticky lg:top-5">
          {list.isPending && <p role="status">Loading submissions…</p>}
          {list.isError && <LoadError retry={() => list.refetch()} />}
          <div className="max-h-[65vh] overflow-auto border border-border">
            {list.data?.items.map((r) => (
              <button
                key={r.id}
                className={`block w-full border-b border-border p-5 text-left last:border-0 hover:bg-foreground/[.03] ${selected === r.id ? "bg-foreground/[.06]" : ""}`}
                onClick={() =>
                  setParams(
                    artist ? { release: r.id, artist } : { release: r.id },
                  )
                }
              >
                <span className="block font-display text-lg">{r.title}</span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {statusLabels[r.status as ReleaseStatus]} ·{" "}
                  {new Date(r.updated_at).toLocaleDateString()}
                </span>
                {r.awaiting_changes && (
                  <span className="mt-2 block text-xs">
                    Awaiting artist changes
                  </span>
                )}
                {!r.artist_id && (
                  <span className="mt-2 block text-xs text-muted-foreground">
                    Artist name needs approval
                  </span>
                )}
              </button>
            ))}
            {list.data?.items.length === 0 && (
              <p className="p-8 text-sm text-muted-foreground">
                No submissions in this view.
              </p>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span>
              {list.data?.count ?? 0} releases · Page {page + 1}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={(page + 1) * 25 >= (list.data?.count ?? 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </aside>
        {selected ? (
          <ReleaseDetail key={selected} id={selected} admin />
        ) : (
          <div className="border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Select a submission to listen and review.
          </div>
        )}
      </div>
    </PortalShell>
  );
}
