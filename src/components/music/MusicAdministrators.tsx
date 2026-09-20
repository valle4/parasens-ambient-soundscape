import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { musicClient, musicRpc } from "@/lib/music/api";
export default function MusicAdministrators() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const admins = useQuery({
    queryKey: ["music-administrators"],
    queryFn: async () => {
      const { data, error } = await musicClient()
        .from("music_admins")
        .select("email,role")
        .order("created_at");
      if (error) throw error;
      return data as { email: string; role: string }[];
    },
  });
  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await musicClient().functions.invoke(
        "invite-music-admin",
        { body: { email: email.trim().toLowerCase() } },
      );
      if (error) {
        let message =
          "Could not send the invitation. Check that administrator invitations have been set up.";
        if (error.context instanceof Response) {
          const body = await error.context.json().catch(() => null);
          if (body?.error) message = body.error;
        }
        throw new Error(message);
      }
      toast.success(data.message);
      setEmail("");
      await admins.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invitation failed.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (address: string) => {
    if (
      !window.confirm(
        `Remove Music Library administrator access for ${address}? Their artist portal account will remain available.`,
      )
    )
      return;
    setBusy(true);
    try {
      await musicRpc("music_manage_admin", {
        p_email: address,
        p_remove: true,
      });
      await admins.refetch();
      toast.success("Administrator access removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove access.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="max-w-3xl space-y-7 border border-border p-5 md:p-8">
      <div>
        <h2 className="font-display text-xl">Administrators</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Administrators can import, tag, publish, archive and reorder songs.
          Only you, the owner, can manage administrator access.
        </p>
      </div>
      <form onSubmit={invite} className="space-y-3">
        <label htmlFor="admin-email" className="text-sm">
          Invite an administrator
        </label>
        <div className="flex flex-wrap gap-3">
          <Input
            id="admin-email"
            type="email"
            required
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="min-w-48 flex-1"
          />
          <Button disabled={busy}>
            {busy ? "Working…" : "Send administrator invitation"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          New portal members receive an invitation email. Existing members gain
          access through their usual portal sign-in.
        </p>
      </form>
      {admins.isError && (
        <p role="alert">
          Could not load administrators.{" "}
          <button className="underline" onClick={() => admins.refetch()}>
            Retry
          </button>
        </p>
      )}
      <div className="divide-y divide-border">
        {admins.data?.map((a) => (
          <div
            key={a.email}
            className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
          >
            <div>
              {a.email}
              <span className="ml-3 text-xs text-muted-foreground">
                {a.role === "owner" ? "Owner" : "Administrator"}
              </span>
            </div>
            {a.role !== "owner" && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void remove(a.email)}
              >
                Remove access
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
