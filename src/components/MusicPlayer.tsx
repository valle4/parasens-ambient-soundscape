import { useState } from "react";
import { Play, ChevronUp, MousePointerClick } from "lucide-react";
import useScrollReveal from "@/hooks/useScrollReveal";

import { useQuery } from "@tanstack/react-query";
import {
  legacyTracks,
  legacyGenres,
  legacySubCategories,
} from "@/data/legacy-music";
import { loadCatalogue } from "@/lib/music/api";
import { tracksInScope } from "@/lib/music/catalogue";

const liveLibrary = import.meta.env.VITE_MUSIC_LIBRARY_ENABLED === "true";

const MusicPlayer = () => {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(
    null,
  );
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  const { ref: headerRef, isRevealed: headerRevealed } = useScrollReveal();
  const { ref: genreRef, isRevealed: genreRevealed } = useScrollReveal();
  const { ref: tracksRef, isRevealed: tracksRevealed } = useScrollReveal();

  const catalogue = useQuery({
    queryKey: ["public-music"],
    queryFn: () => loadCatalogue(true),
    enabled: liveLibrary,
    staleTime: 30_000,
  });
  const data = catalogue.data;
  const genreCategories = data?.categories.filter((c) => !c.parent_id) ?? [];
  const genres = liveLibrary
    ? [{ id: "All", name: "All" }, ...genreCategories]
    : legacyGenres.map((name) => ({ id: name, name }));
  const genreId = selectedGenre === "All" ? undefined : selectedGenre;
  const subcategories =
    data?.categories.filter((c) => c.parent_id === genreId) ?? [];
  const availableSubCategories = liveLibrary
    ? subcategories
    : selectedGenre !== "All"
      ? (legacySubCategories[selectedGenre] || []).map((name) => ({
          id: name,
          name,
        }))
      : [];
  const scope = selectedSubCategory ?? genreId;
  const filteredTracks = liveLibrary
    ? data
      ? tracksInScope(data, scope ?? "all", true).map((t) => ({
          ...t,
          spotifyId: t.id,
          subCategory: data.tags
            .filter((tag) => tag.track_id === t.id)
            .map(
              (tag) =>
                data.categories.find((c) => c.id === tag.category_id)?.name,
            )
            .filter(Boolean)
            .join(" · "),
        }))
      : []
    : legacyTracks
        .filter(
          (t) =>
            (selectedGenre === "All" || t.genre === selectedGenre) &&
            (!selectedSubCategory || t.subCategory === selectedSubCategory),
        )
        .map((t) => ({
          ...t,
          id: t.spotifyId.split("?")[0],
          spotifyId: t.spotifyId.split("?")[0],
        }));

  const handleGenreSelect = (genre: string) => {
    setSelectedGenre(genre);
    setSelectedSubCategory(null);
    setExpandedTrackId(null);
  };

  const handleSubCategorySelect = (sub: string | null) => {
    setSelectedSubCategory(sub);
    setExpandedTrackId(null);
  };

  const handleTrackSelect = (track: { id: string }) => {
    setExpandedTrackId(expandedTrackId === track.id ? null : track.id);
  };

  return (
    <section id="music" className="min-h-screen section-padding bg-card">
      <div className="max-w-5xl mx-auto">
        <div
          ref={headerRef}
          className={`scroll-reveal text-center ${headerRevealed ? "revealed" : ""}`}
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
            Listen
          </h2>
          <p className="text-muted-foreground text-lg mb-12 md:mb-16">
            Select a mood. Press play.
          </p>
        </div>

        {/* Genre Selector */}
        <div
          ref={genreRef}
          className={`flex flex-wrap justify-center gap-2 md:gap-4 mb-6 scroll-reveal scroll-reveal-delay-1 ${genreRevealed ? "revealed" : ""}`}
        >
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => handleGenreSelect(genre.id)}
              className={`genre-button ${selectedGenre === genre.id ? "genre-button-active" : "genre-button-inactive"}`}
            >
              {genre.name}
            </button>
          ))}
        </div>

        {/* Sub-Category Selector - Only show when a genre is selected */}
        {availableSubCategories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-12 md:mb-16">
            <button
              onClick={() => handleSubCategorySelect(null)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                selectedSubCategory === null
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All {genres.find((genre) => genre.id === selectedGenre)?.name}
            </button>
            {availableSubCategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSubCategorySelect(sub.id)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                  selectedSubCategory === sub.id
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {/* Spacer when no sub-categories */}
        {availableSubCategories.length === 0 && (
          <div className="mb-6 md:mb-10" />
        )}

        {liveLibrary && catalogue.isPending && (
          <p role="status" className="py-8 text-center text-muted-foreground">
            Loading music…
          </p>
        )}
        {liveLibrary && catalogue.isError && (
          <p role="alert" className="py-8 text-center text-muted-foreground">
            Music is temporarily unavailable.{" "}
            <button onClick={() => catalogue.refetch()} className="underline">
              Try again
            </button>
          </p>
        )}
        {liveLibrary && data && !filteredTracks.length && (
          <p className="py-8 text-center text-muted-foreground">
            No songs published in this category yet.
          </p>
        )}
        {/* Track List */}
        <div
          ref={tracksRef}
          className={`max-h-[500px] overflow-y-auto scroll-reveal scroll-reveal-delay-2 ${tracksRevealed ? "revealed" : ""}`}
        >
          <div className="space-y-1">
            {filteredTracks.map((track, index) => (
              <div
                key={track.id}
                className="border-b border-border/50 last:border-b-0"
              >
                {/* Track Row */}
                <button
                  type="button"
                  aria-expanded={expandedTrackId === track.id}
                  onClick={() => handleTrackSelect(track)}
                  className={`w-full text-left track-row group flex items-center justify-between py-4 px-4 cursor-pointer transition-all duration-300 hover:bg-accent hover:translate-x-1 ${
                    expandedTrackId === track.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <span className="text-muted-foreground text-sm w-6 flex items-center justify-center">
                      {expandedTrackId === track.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <>
                          <span className="group-hover:hidden">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <Play className="w-4 h-4 hidden group-hover:block fill-current" />
                        </>
                      )}
                    </span>
                    <div>
                      <p className="font-medium">{track.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {track.artist}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {track.subCategory}
                  </span>
                </button>

                {/* Expandable Spotify Player */}
                {expandedTrackId === track.id && (
                  <div className="px-4 pb-4 animate-accordion-down overflow-hidden">
                    <div className="flex items-center justify-center gap-2 mb-3 text-muted-foreground">
                      <MousePointerClick className="w-4 h-4 animate-pulse" />
                      <span className="text-sm">Click the player to start</span>
                    </div>
                    <iframe
                      title={`Listen to ${track.title} by ${track.artist}`}
                      src={`https://open.spotify.com/embed/track/${track.spotifyId}?utm_source=generator&theme=0`}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="eager"
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MusicPlayer;
