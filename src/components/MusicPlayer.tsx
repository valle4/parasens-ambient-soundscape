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

// Tracks from the playlist
const tracks: Track[] = [
  { id: 1, title: "Ponceau", artist: "Ray Love", genre: "Piano", spotifyId: "1qCrvHUu3jt5oSpvYaVrwH" },
  { id: 2, title: "estiu", artist: "Valentine Summers", genre: "Ambient", spotifyId: "1vzwRWE2Vj7JZwqBqi9ivM" },
  { id: 3, title: "Juliet Rose", artist: "A Little Time", genre: "Piano", spotifyId: "5eiXYdSRFd48jBqnQrw83h" },
  { id: 4, title: "Echidna", artist: "Northern Dreams", genre: "Ambient", spotifyId: "66IOe8PcQPacJ3D3MtGLMS" },
  { id: 5, title: "sēnse", artist: "ispirà", genre: "Ambient", spotifyId: "7xAEN2uqrL8MGnpuyAbrmd" },
  { id: 6, title: "From a Distance", artist: "Mindy Thurma", genre: "Piano", spotifyId: "7DSAwNkmall9lAltVsoWFw" },
  { id: 7, title: "The Years Grew Quiet", artist: "Giorgio Rossi", genre: "Piano", spotifyId: "5TjMmdE5zIWUrFhBqL9Lge" },
  { id: 8, title: "Ember", artist: "Lunar Lull", genre: "Ambient", spotifyId: "7yZcjQGSDcKdxAmxJ7rvqd" },
  { id: 9, title: "Jade Vine", artist: "Moonsong", genre: "Ambient", spotifyId: "6rr10DYH1fRl2r1JATikzT" },
  { id: 10, title: "Between Heartbeats", artist: "Cassian Lake", genre: "Piano", spotifyId: "4WxEAxB8e317cYBRwz9NaO" },
  { id: 11, title: "Ashlight", artist: "Runā Væra", genre: "Acoustic Cover", spotifyId: "0opEMDtj6BWB0zitXoJx5d" },
  { id: 12, title: "Messy", artist: "Runā Væra", genre: "Acoustic Cover", spotifyId: "4fK6LMhdx6DCFO4ShQsvI3" },
  { id: 13, title: "Still Crazy After All These Years", artist: "Runā Væra", genre: "Acoustic Cover", spotifyId: "5nC0JYo9VuvDMBzMlgVAvY" },
  { id: 14, title: "I Love Every Little Thing About You", artist: "Runā Væra", genre: "Acoustic Cover", spotifyId: "4m78bGAE8y27nVVvo88L5M" },
  { id: 15, title: "Iris", artist: "Allena", genre: "Acoustic Cover", spotifyId: "4ZXTjnWKgkJdcOu41Izs7d" },
  { id: 16, title: "Beautiful Things", artist: "Esther & John", genre: "Acoustic Cover", spotifyId: "6nnNpzVfOVfYcTlAwNnTzU" },
  { id: 17, title: "Man I Need", artist: "Esther & John", genre: "Acoustic Cover", spotifyId: "6UuKo0mzNdThLwt1DlobiP" },
  { id: 18, title: "feelslikeimfallinginlove", artist: "Esther & John", genre: "Acoustic Cover", spotifyId: "2x60ePnBzW1db4JOyxBW6u" },
  { id: 19, title: "Birds of a Feather", artist: "Gustav & Julia", genre: "Acoustic Cover", spotifyId: "6Mcwnd9E7rhABPZUPZpxCX" },
  { id: 20, title: "Kiss - Acoustic Version", artist: "Gustav & Julia", genre: "Acoustic Cover", spotifyId: "0J9liajekfS7m5egdYmmbD" },
  { id: 21, title: "Blue Haze", artist: "Ray Love Trio", genre: "Jazz", spotifyId: "1s1l7ksPaqruuvc4LdCH6f" },
  { id: 22, title: "Serevine", artist: "A Whisper", genre: "Ambient", spotifyId: "1U7fnO16fpCkir1Z8RDdt3" },
  { id: 23, title: "Evening Sun", artist: "Alec Taylor Trio", genre: "Jazz", spotifyId: "5Kwzs76HmFATFfdAHEN1tw" },
  { id: 24, title: "The Quiet Storm", artist: "Andy Luma Trio", genre: "Jazz", spotifyId: "5caSbCpxmMVfAdq6wt37nF" },
  { id: 25, title: "The Things We Did Last Summer", artist: "Einar Magnusson", genre: "Jazz", spotifyId: "2kZE2oq2A6IdoXFxNEVQwV" },
  { id: 26, title: "A Wayfarer's Tale", artist: "Ray Love Trio", genre: "Jazz", spotifyId: "0RrvMxwdAX6qBQHjR3EEPZ" },
  { id: 27, title: "Midnight Drift", artist: "Urskogen Jazz", genre: "Jazz", spotifyId: "6UjkXOZj0kZB3XTJrGxoIS" },
  { id: 28, title: "Another Time", artist: "Northern Dreams", genre: "Ambient", spotifyId: "7lk8jlre48y3teEbgRvrMT" },
  { id: 29, title: "This Time Tomorrow", artist: "Helmut Cole Trio", genre: "Jazz", spotifyId: "7s8J2SLXguqAT8RqoqSXoh" },
  { id: 30, title: "Flamingo", artist: "Ray Love", genre: "Piano", spotifyId: "5hUBEW72nvmwnibrFUFemr" },
  { id: 31, title: "For Sentimental Reasons", artist: "Ray Love Trio", genre: "Jazz", spotifyId: "16XLUnjRsRJ2ZAUTsxCH1D" },
  { id: 32, title: "Spring Green", artist: "Einar Magnusson", genre: "Piano", spotifyId: "0Yn1xmq6NE9XWeUBnPGyb6" },
  { id: 33, title: "Silver Starling", artist: "Maurillo", genre: "Piano", spotifyId: "5rwMEeR0gsn2pivUE2R99J" },
  { id: 34, title: "O Sol e Você", artist: "Douglas Ruby Trio", genre: "Bossa Nova", spotifyId: "4vNwnJae8o9CEB2FMriGCa" },
  { id: 35, title: "In the Arms of the Moon", artist: "Irvin Smith Group", genre: "Jazz", spotifyId: "1IyTd7bacOtYouAi2LSknM" },
  { id: 36, title: "A Última Canção", artist: "Karl-Erik Trio", genre: "Bossa Nova", spotifyId: "5mGMnKiVkI4QQAnlfZBGWh" },
  { id: 37, title: "Noite de Luzes Perdidas", artist: "Alec Taylor Trio", genre: "Bossa Nova", spotifyId: "3dA9qQ6WTCCKbFcrlzV3gI" },
  { id: 38, title: "In Every Gaze", artist: "Isac Solo Trio", genre: "Jazz", spotifyId: "0okadaNpxIXbYtMOMoIg9Z" },
  { id: 39, title: "Star Rain", artist: "Ray Love Trio", genre: "Jazz", spotifyId: "1H2mfBUP4SJ8rXoYp7Ylpy" },
  { id: 40, title: "Rastro de Luz", artist: "Kristian Hart Trio", genre: "Bossa Nova", spotifyId: "4owVHaczMrY21ppWgasyx7" },
  { id: 41, title: "Christmas Is Coming", artist: "Isac Solo Trio", genre: "Christmas", spotifyId: "149nYuNSxKF3rPGpReOjtv" },
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
