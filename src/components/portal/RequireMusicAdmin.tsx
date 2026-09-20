import { Link, Outlet } from "react-router-dom";
import { useMusicAdmin } from "@/hooks/useMusicAdmin";
export default function RequireMusicAdmin() {
  const role = useMusicAdmin();
  if (role.isPending)
    return (
      <main className="min-h-screen grid place-items-center" role="status">
        Checking administrator access…
      </main>
    );
  if (!role.data)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="font-display text-3xl">Music Library</h1>
        <p>
          {role.isError
            ? "The Music Library is not available yet. Please try again after setup."
            : "This area is for invited administrators."}
        </p>
        {role.isError && (
          <button onClick={() => role.refetch()} className="underline">
            Try again
          </button>
        )}
        <Link className="underline" to="/portal/dashboard">
          Return to your portal
        </Link>
      </main>
    );
  return <Outlet />;
}
