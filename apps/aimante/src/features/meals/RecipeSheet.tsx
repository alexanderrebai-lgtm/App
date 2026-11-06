import { type FormEvent, useEffect, useState } from "react";
import { deleteRecipe, saveRecipe } from "../../data/meals";
import type { Recipe } from "../../domain/types";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";

interface Props {
  open: boolean;
  /** null = nouvelle recette */
  recipe: Recipe | null;
  onClose: () => void;
}

export function RecipeSheet({ open, recipe, onClose }: Props) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(recipe?.name ?? "");
    setNote(recipe?.note ?? "");
    setIngredients(recipe?.ingredients.map((i) => i.name).join("\n") ?? "");
    setConfirmDelete(false);
  }, [open, recipe]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await saveRecipe({ id: recipe?.id, name, note, ingredients });
    toast(recipe ? "Recette modifiée." : "Recette ajoutée.");
    onClose();
  }

  async function remove() {
    if (!recipe) return;
    await deleteRecipe(recipe.id);
    toast("Recette supprimée, et retirée du menu.");
    onClose();
  }

  return (
    <Sheet open={open} title={recipe ? "Modifier la recette" : "Nouvelle recette"} onClose={onClose}>
      <form className="form c-red" onSubmit={submit}>
        <div className="field">
          <label htmlFor="r-name">Nom</label>
          <input id="r-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="r-note">Note courte</label>
          <input
            id="r-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="15 min, double portion…"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="r-ings">Ingrédients, un par ligne</label>
          <textarea id="r-ings" rows={6} value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
          <p className="hint">Le rayon de chaque ingrédient est deviné pour la liste de courses.</p>
        </div>
        <button type="submit" className="btn primary">
          {recipe ? "Enregistrer" : "Ajouter"}
        </button>
      </form>
      {recipe &&
        (confirmDelete ? (
          <div className="panel" role="alertdialog" aria-label="Confirmer la suppression">
            <p className="small">Supprimer « {recipe.name} » ? Elle sera aussi retirée des repas prévus.</p>
            <div className="btns">
              <button type="button" className="btn primary" onClick={remove}>
                Oui, supprimer
              </button>
              <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn ghost danger" onClick={() => setConfirmDelete(true)}>
            Supprimer cette recette
          </button>
        ))}
    </Sheet>
  );
}
