import { useQuery } from "@tanstack/react-query";
import { usePortalAuth } from "@/contexts/portal-auth";
import { musicRpc } from "@/lib/music/api";
export function useMusicAdmin() {
  const { user } = usePortalAuth();
  return useQuery({
    queryKey: ["music-role", user?.id],
    queryFn: () => musicRpc<"owner" | "admin" | null>("music_admin_role"),
    enabled: Boolean(user),
    retry: false,
    staleTime: 30_000,
  });
}
