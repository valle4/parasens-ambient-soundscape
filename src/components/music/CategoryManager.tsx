import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { musicRpc } from "@/lib/music/api";
import { categoryLabel, type Category } from "@/lib/music/catalogue";
export default function CategoryManager({
  categories,
  onChange,
}: {
  categories: Category[];
  onChange: () => Promise<unknown>;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [busy, setBusy] = useState(false);
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
  return (
    <section className="grid gap-8 border border-border p-5 md:grid-cols-2 md:p-8">
      <div>
        <h2 className="font-display text-xl">Genres & subgenres</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create categories as you go, or rename and reorganise existing ones.
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
            {busy ? "Saving…" : "Save category"}
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
      </form>
    </section>
  );
}
