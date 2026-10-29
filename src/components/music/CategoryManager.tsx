import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { musicRpc } from "@/lib/music/api";
import { categoryLabel, type Category, type TrackTag } from "@/lib/music/catalogue";
export default function CategoryManager({
  categories,
  tags,
  onChange,
}: {
  categories: Category[];
  tags: TrackTag[];
  onChange: () => Promise<unknown>;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selected = categories.find((c) => c.id === id);
  const songCount = tags.filter((t) => t.category_id === id).length;
  const childCount = categories.filter((c) => c.parent_id === id).length;
  const deleteBlocked = songCount > 0 || childCount > 0;
  const genreKind = selected?.parent_id ? "subgenre" : "genre";
  const edit = (c?: Category) => {
    setId(c?.id ?? "");
    setName(c?.name ?? "");
    setParent(c?.parent_id ?? "");
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await musicRpc("music_save_category", {
        p_id: id || null,
        p_name: name,
        p_parent: parent || null,
      });
      await onChange();
      edit();
      toast.success("Category saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save category.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!selected || busy || deleteBlocked) return;
    setBusy(true);
    setDeleting(true);
    try {
      await musicRpc("music_delete_category", { p_id: selected.id });
      setConfirmDelete(false);
      edit();
      toast.success("Genre deleted.");
      await onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete genre.");
    } finally {
      setBusy(false);
      setDeleting(false);
    }
  };
  return (
    <section className="grid gap-8 border border-border p-5 md:grid-cols-2 md:p-8">
      <div>
        <h2 className="font-display text-xl">Genres & subgenres</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create, rename and reorganise genres, or delete ones you no longer use.
        </p>
        <div className="mt-6 max-h-96 space-y-1 overflow-auto">
          {categories.map((c) => (
            <button
              disabled={busy}
              key={c.id}
              className={`block w-full border-b border-border p-3 text-left text-sm hover:bg-accent ${id === c.id ? "bg-accent" : ""}`}
              onClick={() => edit(c)}
            >
              {categoryLabel(c, categories)}
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={save} className="space-y-5">
        <h3 className="font-display text-lg">
          {id ? "Edit category" : "Create category"}
        </h3>
        <label className="block text-sm">
          Name
          <Input
            className="mt-2"
            value={name}
            maxLength={80}
            required
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Parent genre
          <select
            className="mt-2 w-full border border-input bg-background p-3"
            disabled={busy || categories.some((c) => c.parent_id === id)}
            value={parent}
            onChange={(e) => setParent(e.target.value)}
          >
            <option value="">None — this is a genre</option>
            {categories
              .filter((c) => !c.parent_id && c.id !== id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <div className="flex gap-3">
          <Button disabled={busy || !name.trim()}>
            {busy && !deleting ? "Saving…" : "Save category"}
          </Button>
          {id && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => edit()}
            >
              Create another
            </Button>
          )}
        </div>
        {selected && (
          <div className="space-y-3 border-t border-border pt-5">
            {deleteBlocked && (
              <p id="genre-delete-help" className="text-sm text-muted-foreground">
                Before deleting this {genreKind}:
                {songCount > 0 && ` remove it from ${songCount} song${songCount === 1 ? "" : "s"} (including drafts and archived songs).`}
                {childCount > 0 && ` Move or delete its ${childCount} subgenre${childCount === 1 ? "" : "s"}.`}
              </p>
            )}
            <AlertDialog open={confirmDelete} onOpenChange={(open) => { if (!busy) setConfirmDelete(open); }}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={busy || deleteBlocked}
                  aria-describedby={deleteBlocked ? "genre-delete-help" : undefined}>
                  Delete {genreKind}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {genreKind} “{selected.name}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This {genreKind} will be permanently removed. No songs will be deleted. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                  <Button type="button" variant="destructive" disabled={busy || deleteBlocked} onClick={remove}>
                    {deleting ? "Deleting…" : `Delete ${genreKind}`}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </form>
    </section>
  );
}
