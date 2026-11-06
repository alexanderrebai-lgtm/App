import { type FormEvent, useState } from "react";
import { useLive } from "../../data/live";
import { shoppingRepo, staplesRepo } from "../../data/repositories";
import {
  addShoppingItem,
  clearCheckedItems,
  removeShoppingItem,
  stapleInList,
  toggleShoppingItem,
  toggleStaple,
} from "../../data/shopping";
import { AISLES, type ShoppingItem } from "../../domain/types";
import { Check } from "../../ui/Check";
import { IconClose, IconPen, IconPlus } from "../../ui/icons";
import { ScreenHeader, Slip } from "../../ui/Slip";
import { useToast } from "../../ui/Toast";
import { ItemSheet, StaplesSheet } from "./ShoppingSheets";

export function ShoppingScreen() {
  const toast = useToast();
  const items = useLive(shoppingRepo.getAll) ?? [];
  const staples = useLive(async () => (await staplesRepo.getAll()).sort((a, b) => a.order - b.order)) ?? [];
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [staplesOpen, setStaplesOpen] = useState(false);

  const left = items.filter((i) => !i.checked).length;
  const checked = items.length - left;
  // Dans chaque rayon : à acheter d'abord (dans l'ordre d'ajout), puis les articles cochés.
  const groups = AISLES.map(
    (a) =>
      [
        a,
        items
          .filter((i) => i.aisle === a)
          .sort((x, y) => Number(x.checked) - Number(y.checked) || x.createdAt - y.createdAt),
      ] as const,
  ).filter(([, xs]) => xs.length);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const added = await addShoppingItem(name);
    if (!added) toast("Il est déjà sur la liste.");
    setName("");
  }

  async function onClear() {
    const n = await clearCheckedItems();
    toast(`${n} article${n > 1 ? "s" : ""} retiré${n > 1 ? "s" : ""}.`);
  }

  return (
    <>
      <ScreenHeader eyebrow="Rangée par rayon" title="Liste de courses" />

      <Slip color="yellow">
        <form className="add c-yellow" onSubmit={submit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ajouter un article…"
            aria-label="Nouvel article"
            autoComplete="off"
            enterKeyHint="done"
          />
          <button type="submit" className="btn primary" aria-label="Ajouter l'article" style={{ paddingInline: 12 }}>
            <IconPlus width={20} height={20} />
          </button>
        </form>
        <div>
          <div className="slip-head">
            <h2 className="eyebrow" style={{ fontSize: 11.5 }}>
              Toujours à la maison · touche pour ajouter
            </h2>
            <button type="button" className="link" onClick={() => setStaplesOpen(true)}>
              Gérer
            </button>
          </div>
          <div className="chips" style={{ marginTop: 4 }}>
            {staples.map((s) => {
              const on = stapleInList(s, items);
              return (
                <button
                  type="button"
                  key={s.id}
                  className={`chip ${on ? "in" : ""}`}
                  aria-pressed={on}
                  onClick={() => toggleStaple(s)}
                >
                  {on ? "✓ " : "+ "}
                  {s.name}
                </button>
              );
            })}
            {!staples.length && <p className="empty">Aucun produit. Touche « Gérer » pour en ajouter.</p>}
          </div>
        </div>
      </Slip>

      <Slip
        color="yellow"
        title={
          <>
            <span className="num">{left}</span> article{left > 1 ? "s" : ""}
          </>
        }
        aside={
          checked > 0 ? (
            <button type="button" className="link" onClick={onClear}>
              {checked > 1 ? `Retirer les ${checked} cochés` : "Retirer l'article coché"}
            </button>
          ) : undefined
        }
      >
        {groups.length ? (
          groups.map(([aisle, xs]) => (
            <div key={aisle}>
              <h3 className="aisle">{aisle}</h3>
              <div className="list">
                {xs.map((x) => (
                  <div className={`row ${x.checked ? "done" : ""}`} key={x.id}>
                    <Check checked={x.checked} label={x.name} onToggle={() => toggleShoppingItem(x.id)} />
                    <div className="grow">
                      <span className="t">{x.name}</span> {x.origin === "menu" && <span className="tag">menu</span>}
                    </div>
                    <button type="button" className="icon-btn" onClick={() => setEditing(x)} aria-label={`Modifier : ${x.name}`}>
                      <IconPen />
                    </button>
                    <button type="button" className="icon-btn" onClick={() => removeShoppingItem(x.id)} aria-label={`Supprimer : ${x.name}`}>
                      <IconClose />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="empty">Liste vide. Ajoute un article, touche un essentiel ou envoie les ingrédients du menu.</p>
        )}
      </Slip>

      <ItemSheet item={editing} onClose={() => setEditing(null)} />
      <StaplesSheet open={staplesOpen} onClose={() => setStaplesOpen(false)} />
    </>
  );
}
