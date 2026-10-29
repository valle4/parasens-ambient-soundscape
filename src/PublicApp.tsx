import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import CustomCursor from "@/components/CustomCursor";
import MouseSpotlight from "@/components/MouseSpotlight";
import Index from "@/pages/Index";
import type { Catalogue } from "@/lib/music/catalogue";

export type PublicPageData = { catalogue?: Catalogue; fetchedAt: number };

// Shared by Cloudflare and the browser. A fresh client per page/request keeps
// public data isolated from the portal's authenticated query cache.
export default function PublicApp({ catalogue, fetchedAt }: PublicPageData) {
  const [queryClient] = useState(() => {
    const client = new QueryClient();
    if (catalogue) client.setQueryData(["public-music"], catalogue, { updatedAt: fetchedAt });
    return client;
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {mounted && <><CustomCursor /><MouseSpotlight /></>}
        <div className="bg-orb-layer" />
        <div className="vignette" />
        <div className="public-home"><Index /></div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
