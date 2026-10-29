import { useEffect, useMemo, useRef, useState } from "react";
import { Play, ChevronUp, ArrowLeft } from "lucide-react";
import useScrollReveal from "@/hooks/useScrollReveal";
import SpotifyTrackPreview from "@/components/music/SpotifyTrackPreview";
import { loadSpotifyEmbedApi } from "@/lib/music/spotify-embed";

import { useQuery } from "@tanstack/react-query";
import {
  legacyTracks,
  legacyGenres,
  legacySubCategories,
} from "@/data/legacy-music";
import { loadPublicCatalogue } from "@/lib/music/public-catalogue";
import { tracksInScope } from "@/lib/music/catalogue";

const liveLibrary = import.meta.env.VITE_MUSIC_LIBRARY_ENABLED === "true";

const MusicPlayer = () => {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [genrePickerOpen, setGenrePickerOpen] = useState(true);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const selectedGenreRef = useRef<HTMLButtonElement>(null);
  const shouldFocusPicker = useRef(false);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(
    null,
  );
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  useEffect(() => {
    // Prepare Spotify's controls before the first click. No track is loaded
    // and no playback is requested until the listener opens a row.
    void loadSpotifyEmbedApi().catch(() => {});
  }, []);

  const { ref: headerRef, isRevealed: headerRevealed } = useScrollReveal();
  const { ref: genreRef, isRevealed: genreRevealed } = useScrollReveal();
  const { ref: tracksRef, isRevealed: tracksRevealed } = useScrollReveal();

  useEffect(() => {
    if (!shouldFocusPicker.current) return;
    shouldFocusPicker.current = false;
    const button = genrePickerOpen ? selectedGenreRef.current : backButtonRef.current;
    button?.focus({ preventScroll: true });
    if (genreRef.current && genreRef.current.getBoundingClientRect().top < 96) {
      genreRef.current.scrollIntoView({ block: "start" });
    }
  }, [genrePickerOpen, genreRef]);

  const catalogue = useQuery({
    queryKey: ["public-music"],
    queryFn: loadPublicCatalogue,
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
  const labelsByTrack = useMemo(() => {
    const categories = new Map(data?.categories.map((c) => [c.id, c.name]));
    const labels = new Map<string, string[]>();
    for (const tag of data?.tags ?? []) {
      const name = categories.get(tag.category_id);
      if (!name) continue;
      const names = labels.get(tag.track_id) ?? [];
      names.push(name);
      labels.set(tag.track_id, names);
    }
    return labels;
  }, [data]);
  const filteredTracks = useMemo(
    () =>
      liveLibrary
        ? data
          ? tracksInScope(data, scope ?? "all", true).map((t) => ({
              ...t,
              spotifyId: t.id,
              subCategory: labelsByTrack.get(t.id)?.join(" · ") ?? "",
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
            })),
    [data, scope, labelsByTrack, selectedGenre, selectedSubCategory],
  );

  const handleGenreSelect = (genre: string) => {
    if (genre !== "All") {
      shouldFocusPicker.current = true;
      setGenrePickerOpen(false);
    }
    if (genre === selectedGenre) return;
    setSelectedGenre(genre);
    setSelectedSubCategory(null);
    setExpandedTrackId(null);
  };

  const handleSubCategorySelect = (sub: string | null) => {
    if (sub === selectedSubCategory) return;
    setSelectedSubCategory(sub);
    setExpandedTrackId(null);
  };

  const handleTrackSelect = (track: { id: string }) => {
    setExpandedTrackId(expandedTrackId === track.id ? null : track.id);
  };

  return (
    <section
      id="music"
      className="min-h-screen section-padding bg-card"
    >
      <div className="max-w-5xl mx-auto">
        <div
          ref={headerRef}
          className={`scroll-reveal text-center ${headerRevealed ? "revealed" : ""}`}
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
            Listen
          </h2>
          <p className="text-muted-foreground text-lg mb-8 md:mb-10">
            Select a mood. Press play.
          </p>
        </div>

        {/* Genre Selector */}
        <div
          ref={genreRef}
          className={`mb-8 md:mb-10 scroll-mt-28 scroll-reveal scroll-reveal-delay-1 ${genreRevealed ? "revealed" : ""}`}
        >
          {genrePickerOpen ? (
            <div key="genres" role="group" aria-label="Genres" className="genre-view flex flex-wrap justify-center gap-2 md:gap-4">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  ref={selectedGenre === genre.id ? selectedGenreRef : undefined}
                  aria-pressed={selectedGenre === genre.id}
                  onClick={() => handleGenreSelect(genre.id)}
                  className={`genre-button ${selectedGenre === genre.id ? "genre-button-active" : "genre-button-inactive"}`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          ) : (
            <div
              key={selectedGenre}
              className="genre-view grid grid-cols-1 gap-3"
            >
              <button
                ref={backButtonRef}
                type="button"
                aria-label="Back to all genres"
                onClick={() => {
                  shouldFocusPicker.current = true;
                  setGenrePickerOpen(true);
                }}
                className="genre-back inline-flex min-h-11 items-center gap-2 justify-self-center whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                All genres
              </button>
              <div
                role="group"
                aria-label="Genre filters"
                className={`subgenre-list min-w-0 flex gap-2 md:flex-wrap md:justify-center ${
                  availableSubCategories.length > 0 ? "subgenre-list-scroll" : "justify-center"
                }`}
              >
                <button
                  type="button"
                  aria-pressed={selectedSubCategory === null}
                  onClick={() => handleSubCategorySelect(null)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                    selectedSubCategory === null
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {availableSubCategories.length > 0 ? "All " : ""}
                  {genres.find((genre) => genre.id === selectedGenre)?.name}
                </button>
                {availableSubCategories.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    aria-pressed={selectedSubCategory === sub.id}
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
            </div>
          )}
        </div>

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
          className={`max-h-[500px] overflow-y-auto overflow-x-hidden scroll-reveal scroll-reveal-delay-2 ${tracksRevealed ? "revealed" : ""}`}
        >
          <div className="space-y-1">
            {filteredTracks.map((track, index) => (
              <div
                key={track.id}
                className="public-track border-b border-border/50 last:border-b-0"
                style={
                  expandedTrackId === track.id
                    ? { contentVisibility: "visible" }
                    : undefined
                }
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
                    <SpotifyTrackPreview
                      key={track.id}
                      id={track.spotifyId}
                      title={`Listen to ${track.title} by ${track.artist}`}
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
