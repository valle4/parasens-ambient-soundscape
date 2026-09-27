import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMusicAdmin } from "@/hooks/useMusicAdmin";
import PortalShell, { LoadError } from "@/components/portal/PortalShell";
import { releaseList, statusLabels } from "@/lib/portal/api";
import SearchableSelect from "@/components/music/SearchableSelect";
import { Button } from "@/components/ui/button";
export default function PortalDashboard() {
  const role = useMusicAdmin();
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: ["portal-releases", "artist", status, page],
    queryFn: () => releaseList(status, page),
    enabled: !role.isPending && !role.data,
  });
  if (role.isPending)
    return (
      <p role="status" className="p-12">
        Loading your portal…
      </p>
    );
  if (role.data) return <Navigate to="/portal/admin/submissions" replace />;
  return (
    <PortalShell
      title="Catalogue"
      description="Your drafts, submitted music and conversations with PARASENS."
    >
      <SearchableSelect
        label="Release status"
        value={status}
        onValueChange={(s) => {
          setStatus(s);
          setPage(0);
        }}
        className="mb-6 sm:w-64"
        options={[
          { value: "all", label: "All releases" },
          ...Object.entries(statusLabels).map(([value, label]) => ({
            value,
            label,
          })),
        ]}
      />
      {list.isPending && <p role="status">Loading releases…</p>}
      {list.isError && <LoadError retry={() => list.refetch()} />}
      <div className="divide-y divide-border border-y border-border">
        {list.data?.items.map((r) => (
          <Link
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-5 py-6 hover:bg-foreground/[.025]"
            to={
              r.status === "draft"
                ? `/portal/releases/new?draft=${r.id}`
                : `/portal/releases/${r.id}`
            }
          >
            <div>
              <h2 className="font-display text-xl">{r.title}</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                {r.content.releaseType} · {r.content.tracks?.length ?? 0} tracks
              </p>
            </div>
            <span className="text-sm">
              {r.awaiting_changes
                ? "Awaiting your changes"
                : statusLabels[r.status]}{" "}
              →
            </span>
          </Link>
        ))}
        {list.data?.items.length === 0 && (
          <div className="py-14 text-center">
            <p>No releases here yet.</p>
            <Link
              to="/portal/releases/new"
              className="mt-4 inline-block underline"
            >
              Upload your first release
            </Link>
          </div>
        )}
      </div>
      <div className="mt-6 flex items-center justify-end gap-4 text-xs">
        <Button
          size="sm"
          variant="outline"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        Page {page + 1}
        <Button
          size="sm"
          variant="outline"
          disabled={(page + 1) * 25 >= (list.data?.count ?? 0)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </PortalShell>
  );
}
