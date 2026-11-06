import { type FormEvent, useEffect, useState } from "react";
import { useLive } from "../../data/live";
import { staplesRepo } from "../../data/repositories";
import { addStaple, removeShoppingItem, removeStaple, updateShoppingItem } from "../../data/shopping";
import { AISLES, type Aisle, type ShoppingItem } from "../../domain/types";
import { IconClose } from "../../ui/icons";
import { Sheet } from "../../ui/Sheet";

/** Modifier le nom ou le rayon d'un article, ou le supprimer. */
export function ItemSheet({ item, onClose }: { item: ShoppingItem | null; onClose: () => void }) {
  const [name, setName] = useState("");
  const [aisle, setAisle] = useState<Aisle>("Autre");

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setAisle(item.aisle);
  }, [item]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    await updateShoppingItem(item.id, { name, aisle });
    onClose();
  }

  async function remove() {
    if (!item) return;
    await removeShoppingItem(item.id);
    onClose();
  }

  return (
    <Sheet open={item !== null} title="Modifier l'article" onClose={onClose}>
      <form className="form c-yellow" onSubmit={submit}>
        <div className="field">
          <label htmlFor="i-name">Article</label>
          <input id="i-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="i-aisle">Rayon</label>
          <select id="i-aisle" value={aisle} onChange={(e) => setAisle(e.target.value as Aisle)}>
            {AISLES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn primary">
          Enregistrer
        </button>
      </form>
      <button type="button" className="btn ghost danger" onClick={remove}>
        Supprimer cet article
      </button>
    </Sheet>
  );
}

/** Gérer la liste « Toujours à la maison ». */
export function StaplesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const staples = useLive(async () => (await staplesRepo.getAll()).sort((a, b) => a.order - b.order));
  const [name, setName] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    await addStaple(name);
    setName("");
  }

  return (
    <Sheet open={open} title="Toujours à la maison" onClose={onClose}>
      <p className="small muted">
        Les produits que tu rachètes tout le temps. Un toucher et ils sont sur la liste, un second les retire.
      </p>
      <div className="list">
        {(staples ?? []).map((s) => (
          <div className="row" key={s.id}>
            <div className="grow">
              <span className="t">{s.name}</span>
              <div className="sub">{s.aisle}</div>
            </div>
            <button type="button" className="icon-btn" onClick={() => removeStaple(s.id)} aria-label={`Retirer ${s.name}`}>
              <IconClose />
            </button>
          </div>
        ))}
        {staples && !staples.length && <p className="empty">Aucun produit. Ajoute ceux que tu rachètes souvent.</p>}
      </div>
      <form className="add c-yellow" onSubmit={submit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nouveau produit"
          aria-label="Nouveau produit"
          autoComplete="off"
          required
        />
        <button type="submit" className="btn primary">
          Ajouter
        </button>
      </form>
    </Sheet>
  );
}
