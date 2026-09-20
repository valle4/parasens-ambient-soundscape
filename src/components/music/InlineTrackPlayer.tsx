import { Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InlineTrackPlayer({
  id,
  title,
  busy,
  onEditGenres,
  onClose,
}: {
  id: string;
  title: string;
  busy: boolean;
  onEditGenres: () => void;
  onClose: () => void;
}) {
  return (
    <section
      id={`preview-${id}`}
      aria-label={`Preview ${title}`}
      className="space-y-3 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Listen while you choose genres.
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onEditGenres}
          >
            <Tag className="mr-2 h-3 w-3" /> Edit genres
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Close player for ${title}`}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <iframe
        title={`Spotify player for ${title}`}
        src={`https://open.spotify.com/embed/track/${id}?theme=0`}
        width="100%"
        height="152"
        className="rounded-xl border-0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      />
    </section>
  );
}
