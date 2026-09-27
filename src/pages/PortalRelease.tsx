import { useParams } from "react-router-dom";
import { useMusicAdmin } from "@/hooks/useMusicAdmin";
import PortalShell from "@/components/portal/PortalShell";
import ReleaseDetail from "@/components/portal/admin/ReleaseDetail";
export default function PortalRelease() {
  const { id } = useParams();
  const role = useMusicAdmin();
  return (
    <PortalShell title="Release">
      {id && !role.isPending && (
        <ReleaseDetail key={id} id={id} admin={Boolean(role.data)} />
      )}
    </PortalShell>
  );
}
