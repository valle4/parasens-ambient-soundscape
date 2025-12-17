import { useState, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import useScrollReveal from "@/hooks/useScrollReveal";

interface Track {
  id: number;
  title: string;
  artist: string;
  genre: string;
  duration: string;
}

const genres = [
  "All",
  "Ambient",
  "Piano",
  "Sleep",
  "Jazz",
  "Lullabies",
  "Focus",
];

const tracks: Track[] = [
  { id: 1, title: "Quiet Morning", artist: "PARASENS", genre: "Ambient", duration: "4:32" },
  { id: 2, title: "Rainfall", artist: "PARASENS", genre: "Sleep", duration: "6:15" },
  { id: 3, title: "Nocturne in Grey", artist: "PARASENS", genre: "Piano", duration: "3:48" },
  { id: 4, title: "Late Hours", artist: "PARASENS", genre: "Jazz", duration: "5:21" },
  { id: 5, title: "Drift", artist: "PARASENS", genre: "Ambient", duration: "7:03" },
  { id: 6, title: "Gentle Rest", artist: "PARASENS", genre: "Lullabies", duration: "4:45" },
  { id: 7, title: "Deep Work", artist: "PARASENS", genre: "Focus", duration: "8:12" },
  { id: 8, title: "Moonlit Keys", artist: "PARASENS", genre: "Piano", duration: "5:06" },
];

const MusicPlayer = () => {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  const { ref: headerRef, isRevealed: headerRevealed } = useScrollReveal();
  const { ref: genreRef, isRevealed: genreRevealed } = useScrollReveal();
  const { ref: tracksRef, isRevealed: tracksRevealed } = useScrollReveal();
  const { ref: controlsRef, isRevealed: controlsRevealed } = useScrollReveal();

  // Simulate progress when playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 0.5));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const filteredTracks =
    selectedGenre === "All"
      ? tracks
      : tracks.filter((track) => track.genre === selectedGenre);

  const handleTrackSelect = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
  };

  const handlePlayPause = () => {
    if (!currentTrack && filteredTracks.length > 0) {
      setCurrentTrack(filteredTracks[0]);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handlePrevious = () => {
    if (!currentTrack) return;
    const currentIndex = filteredTracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredTracks.length - 1;
    setCurrentTrack(filteredTracks[prevIndex]);
    setProgress(0);
  };

  const handleNext = () => {
    if (!currentTrack) return;
    const currentIndex = filteredTracks.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = currentIndex < filteredTracks.length - 1 ? currentIndex + 1 : 0;
    setCurrentTrack(filteredTracks[nextIndex]);
    setProgress(0);
  };

  return (
    <section
      id="music"
      className="min-h-screen section-padding bg-card"
    >
      <div className="max-w-5xl mx-auto">
        <div
          ref={headerRef}
          className={`scroll-reveal ${headerRevealed ? "revealed" : ""}`}
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
          className={`flex flex-wrap gap-2 md:gap-4 mb-12 md:mb-16 scroll-reveal scroll-reveal-delay-1 ${genreRevealed ? "revealed" : ""}`}
        >
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`genre-button ${
                selectedGenre === genre
                  ? "genre-button-active"
                  : "genre-button-inactive"
              }`}
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
                  {currentTrack?.id === track.id && isPlaying ? (
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
              <span className="text-muted-foreground text-sm">{track.duration}</span>
            </div>
          ))}
        </div>

        {/* Player Controls */}
        <div
          ref={controlsRef}
          className={`border-t border-border pt-8 scroll-reveal scroll-reveal-delay-3 ${controlsRevealed ? "revealed" : ""}`}
        >
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-[2px] bg-border w-full">
              <div
                className="h-full bg-foreground transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {currentTrack ? (
                <div>
                  <p className="font-medium truncate">{currentTrack.title}</p>
                  <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">Select a track to play</p>
              )}
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={handlePrevious}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={handlePlayPause}
                className="p-4 border border-foreground hover:bg-foreground hover:text-background transition-all duration-300"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={handleNext}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-300 ml-4"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MusicPlayer;
