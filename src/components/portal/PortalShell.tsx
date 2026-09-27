import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import PortalSignOut from "./PortalSignOut";
import { useMusicAdmin } from "@/hooks/useMusicAdmin";
export function AdminNavigation() {
  return (
    <nav
      aria-label="Administration"
      className="flex flex-wrap items-center gap-x-7 gap-y-4 border-b border-border py-5 text-xs"
    >
      <NavLink
        to="/portal/admin/submissions"
        className={({ isActive }) =>
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }
      >
        Submissions
      </NavLink>
      <NavLink
        to="/portal/admin/artists"
        className={({ isActive }) =>
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }
      >
        Artists
      </NavLink>
      <NavLink
        to="/portal/admin/accounts"
        className={({ isActive }) =>
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }
      >
        Accounts
      </NavLink>
      <NavLink
        to="/portal/music"
        className={({ isActive }) =>
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }
      >
        Website music
      </NavLink>
      <Link
        to="/portal/releases/new"
        className="ml-auto border border-border px-4 py-2 hover:border-foreground"
      >
        Upload music +
      </Link>
    </nav>
  );
}
export default function PortalShell({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) {
  const role = useMusicAdmin();
  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground md:px-12 lg:px-20">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <Link to="/" className="font-display text-lg tracking-[.18em]">
          PARASENS
        </Link>
        <div className="flex items-center gap-6">
          <span className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:block">
            {role.data ? "Administration" : "Artist portal"}
          </span>
          <PortalSignOut />
        </div>
      </header>
      {role.data ? (
        <AdminNavigation />
      ) : (
        <nav className="flex justify-between border-b border-border py-5 text-xs">
          <Link to="/portal/dashboard">Catalogue</Link>
          <Link to="/portal/releases/new">Upload music +</Link>
        </nav>
      )}
      <section className="mx-auto max-w-7xl py-10">
        <h1 className="font-display text-4xl md:text-5xl">{title}</h1>
        {description && (
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}
export function LoadError({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="border border-border p-6">
      <p>Could not load this part of the portal.</p>
      <button className="mt-3 underline" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
