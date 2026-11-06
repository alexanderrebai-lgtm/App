import { type FormEvent, useEffect, useState } from "react";
import { setMeal } from "../../data/meals";
import { useLive } from "../../data/live";
import { mealPlanRepo, recipesRepo } from "../../data/repositories";
import { longDate } from "../../domain/dates";
import { mealKey } from "../../domain/meals";
import type { ISODate, MealSlot } from "../../domain/types";
import { Sheet } from "../../ui/Sheet";

export interface SlotRef {
  date: ISODate;
  slot: MealSlot;
}

/** Panneau pour choisir le repas d'une case : une recette, un texte libre, ou rien. */
export function MealSlotSheet({ target, onClose }: { target: SlotRef | null; onClose: () => void }) {
  const key = target ? mealKey(target.date, target.slot) : "";
  const recipes = useLive(async () => (await recipesRepo.getAll()).sort((a, b) => a.name.localeCompare(b.name, "fr")));
  const current = useLive(() => (key ? mealPlanRepo.get(key) : undefined), [key]);
  const [text, setText] = useState("");

  useEffect(() => {
    setText(current?.text ?? "");
  }, [key, current?.text]);

  async function choose(value: { recipeId: string } | { text: string } | null) {
    if (!target) return;
    await setMeal(target.date, target.slot, value);
    onClose();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    choose({ text });
  }

  const title = target ? `${target.slot === "midi" ? "Midi" : "Soir"} · ${longDate(target.date)}` : "";

  return (
    <Sheet open={target !== null} title={title} onClose={onClose}>
      <div className="list c-red">
        {(recipes ?? []).map((r) => {
          const selected = current?.recipeId === r.id;
          return (
            <button
              type="button"
              key={r.id}
              className={`pick ${selected ? "selected" : ""}`}
              aria-pressed={selected}
              onClick={() => choose({ recipeId: r.id })}
            >
              <span>{r.name}</span>
              {r.note && <span className="small muted">{r.note}</span>}
            </button>
          );
        })}
        {recipes && !recipes.length && <p className="empty">Aucune recette. Ajoute-en une depuis l'écran Repas.</p>}
      </div>
      <form className="add c-red" onSubmit={submit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ou écrire autre chose (restes, resto…)"
          aria-label="Texte libre"
          autoComplete="off"
        />
        <button type="submit" className="btn primary">
          OK
        </button>
      </form>
      {current && (
        <button type="button" className="btn ghost" onClick={() => choose(null)}>
          Vider la case
        </button>
      )}
    </Sheet>
  );
}
