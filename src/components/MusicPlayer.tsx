import { useState } from "react";
import useScrollReveal from "@/hooks/useScrollReveal";

interface Track {
  id: number;
  title: string;
  artist: string;
  genre: string;
  spotifyId: string; // Spotify track ID (from the URL: open.spotify.com/track/THIS_ID)
}

const genres = [
  "All",
  "Piano",
  "Ambient",
  "Acoustic Cover",
  "Jazz",
  "Bossa Nova",
  "Classical",
  "Lullabies",
  "Guitar",
  "Rain & Nature",
  "Experimental",
  "Christian",
  "LoFi",
  "Synthwave",
  "Phonk",
  "Christmas",
];

// Helper to extract Spotify track ID from URL or return as-is if already an ID
const extractSpotifyId = (input: string): string => {
  if (input.includes("spotify.com/track/")) {
    const match = input.match(/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : input;
  }
  return input;
};

// Add your Spotify track IDs or full URLs here
const tracks: Track[] = [
  {
    id: 1,
    title: "Ponceau",
    artist: "Ray Love",
    genre: "Piano",
    spotifyId: "https://open.spotify.com/track/1qCrvHUu3jt5oSpvYaVrwH?si=0cfda0915b9c4feb",
  },
  { id: 2, title: "Rainfall", artist: "PARASENS", genre: "Sleep", spotifyId: "3n3Ppam7vgaVa1iaRUc9Lp" },
  { id: 3, title: "Nocturne in Grey", artist: "PARASENS", genre: "Piano", spotifyId: "1HNkqx9Ahdgi1Ixy2xkKkL" },
  { id: 4, title: "Late Hours", artist: "PARASENS", genre: "Jazz", spotifyId: "6rqhFgbbKwnb9MLmUQDhG6" },
  { id: 5, title: "Drift", artist: "PARASENS", genre: "Ambient", spotifyId: "0u2P5u6lvoDfwTYjAADbn4" },
  { id: 6, title: "Gentle Rest", artist: "PARASENS", genre: "Lullabies", spotifyId: "2WfaOiMkCvy7F5fcp2zZ8L" },
  { id: 7, title: "Deep Work", artist: "PARASENS", genre: "Focus", spotifyId: "4cOdK2wGLETKBW3PvgPWqT" },
  { id: 8, title: "Moonlit Keys", artist: "PARASENS", genre: "Piano", spotifyId: "1dfeR4HaWDbWqFHLkxsg1d" },
];

const MusicPlayer = () => {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  const { ref: headerRef, isRevealed: headerRevealed } = useScrollReveal();
  const { ref: genreRef, isRevealed: genreRevealed } = useScrollReveal();
  const { ref: tracksRef, isRevealed: tracksRevealed } = useScrollReveal();
  const { ref: playerRef, isRevealed: playerRevealed } = useScrollReveal();

  const filteredTracks = selectedGenre === "All" ? tracks : tracks.filter((track) => track.genre === selectedGenre);

  const handleTrackSelect = (track: Track) => {
    setCurrentTrack(track);
  };

  return (
    <section id="music" className="min-h-screen section-padding bg-card">
      <div className="max-w-5xl mx-auto">
        <div ref={headerRef} className={`scroll-reveal text-center ${headerRevealed ? "revealed" : ""}`}>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">Listen</h2>
          <p className="text-muted-foreground text-lg mb-12 md:mb-16">Select a mood. Press play.</p>
        </div>

        {/* Genre Selector */}
        <div
          ref={genreRef}
          className={`flex flex-wrap justify-center gap-2 md:gap-4 mb-12 md:mb-16 scroll-reveal scroll-reveal-delay-1 ${genreRevealed ? "revealed" : ""}`}
        >
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`genre-button ${selectedGenre === genre ? "genre-button-active" : "genre-button-inactive"}`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Track List */}
        <div
          ref={tracksRef}
          className={`space-y-1 mb-12 md:mb-16 scroll-reveal scroll-reveal-delay-2 ${tracksRevealed ? "revealed" : ""}`}
        >
          {filteredTracks.map((track, index) => (
            <div
              key={track.id}
              onClick={() => handleTrackSelect(track)}
              className={`group flex items-center justify-between py-4 px-4 cursor-pointer transition-all duration-300 hover:bg-accent ${
                currentTrack?.id === track.id ? "bg-accent" : ""
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-6">
                <span className="text-muted-foreground text-sm w-6">
                  {currentTrack?.id === track.id ? (
                    <span className="inline-block w-2 h-2 bg-foreground rounded-full animate-pulse-slow" />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <div>
                  <p className="font-medium">{track.title}</p>
                  <p className="text-sm text-muted-foreground">{track.genre}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Spotify Embed Player */}
        <div
          ref={playerRef}
          className={`border-t border-border pt-8 scroll-reveal scroll-reveal-delay-3 ${playerRevealed ? "revealed" : ""}`}
        >
          {currentTrack ? (
            <iframe
              src={`https://open.spotify.com/embed/track/${extractSpotifyId(currentTrack.spotifyId)}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl"
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">Select a track to play</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default MusicPlayer;
