import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/portal-auth";
import { finishSpotify } from "@/lib/music/spotify";
export default function PortalSpotifyCallback() {
  const { user } = usePortalAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    finishSpotify(user.id)
      .then(() => {
        if (active) navigate("/portal/music?tab=import", { replace: true });
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user.id, navigate]);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-3xl">Connect Spotify</h1>
      <p role={error ? "alert" : "status"}>
        {error || "Completing your Spotify connection…"}
      </p>
      {error && (
        <Link className="underline" to="/portal/music?tab=import">
          Return to the library
        </Link>
      )}
    </main>
  );
}
