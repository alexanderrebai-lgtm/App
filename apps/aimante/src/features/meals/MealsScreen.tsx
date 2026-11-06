import { useState } from "react";
import { fillEmptyDinners, sendMenuToShopping } from "../../data/meals";
import { useLive } from "../../data/live";
import { getMealPlan, recipesRepo } from "../../data/repositories";
import { addDays, dayOfMonth, longDate, mondayOf, shortDate, weekDays, weekdayShort } from "../../domain/dates";
import { mealLabel, plannedCount } from "../../domain/meals";
import type { Recipe } from "../../domain/types";
import { IconNext, IconPen, IconPrev } from "../../ui/icons";
import { ScreenHeader, Slip } from "../../ui/Slip";
import { useToast } from "../../ui/Toast";
import { useToday } from "../../ui/useToday";
import { MealSlotSheet, type SlotRef } from "./MealSlotSheet";
import { RecipeSheet } from "./RecipeSheet";

export function MealsScreen() {
  const t = useToday();
  const toast = useToast();
  const [weekStart, setWeekStart] = useState(() => mondayOf(t));
  const [slot, setSlot] = useState<SlotRef | null>(null);
  const [editing, setEditing] = useState<Recipe | null | undefined>(undefined);
  const days = weekDays(weekStart);
  const recipes = useLive(async () => (await recipesRepo.getAll()).sort((a, b) => a.name.localeCompare(b.name, "fr")));
  const plan = useLive(() => getMealPlan(days[0]!, days[6]!), [weekStart]);

  const planned = plannedCount(plan ?? [], recipes ?? []);
  const label = (date: string, s: "midi" | "soir") =>
    mealLabel(plan?.find((x) => x.date === date && x.slot === s), recipes ?? []);

  async function onFill() {
    if (!recipes?.length) return toast("Ajoute d'abord une recette.");
    const n = await fillEmptyDinners(weekStart);
    toast(n ? `${n} soir${n > 1 ? "s" : ""} rempli${n > 1 ? "s" : ""}. Change ce qui ne te plaît pas.` : "Tous les soirs sont déjà prévus.");
  }

  async function onSend() {
    const n = await sendMenuToShopping(weekStart);
    toast(n ? `${n} ingrédient${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""} à la liste de courses.` : "Rien de nouveau à ajouter : tout est déjà sur la liste.");
  }

  return (
    <>
      <ScreenHeader eyebrow="Bien manger sans y penser" title="Menu de la semaine" />
      <Slip color="red">
        <div className="weeknav">
          <button type="button" className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Semaine précédente">
            <IconPrev />
          </button>
          <div>
            <h2>Semaine du {shortDate(weekStart)}</h2>
            <div className="eyebrow num">{planned}/14 repas prévus</div>
          </div>
          <button type="button" className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Semaine suivante">
            <IconNext />
          </button>
        </div>
        <div>
          {days.map((d) => (
            <div key={d} className={`day ${d === t ? "is-today" : ""}`}>
              <div className="dn">
                {weekdayShort(d)}
                <small>{dayOfMonth(d)}</small>
                {d === t && <span className="sr-only"> (aujourd'hui)</span>}
              </div>
              {(["midi", "soir"] as const).map((s) => {
                const l = label(d, s);
                return (
                  <button
                    type="button"
                    key={s}
                    className={`meal ${l ? "" : "empty-slot"}`}
                    onClick={() => setSlot({ date: d, slot: s })}
                    aria-label={`${s === "midi" ? "Midi" : "Soir"}, ${longDate(d)} : ${l ?? "rien de prévu"}`}
                  >
                    <small aria-hidden="true">{s}</small>
                    <span aria-hidden="true">{l ?? "+"}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="btns">
          <button type="button" className="btn primary" onClick={onSend}>
            Ajouter les ingrédients à la liste
          </button>
          <button type="button" className="btn" onClick={onFill}>
            Remplir les cases vides
          </button>
        </div>
        <p className="tip">Astuce : les plats « double portion » se cuisinent une fois et font aussi le repas du lendemain midi.</p>
      </Slip>

      <Slip
        color="red"
        title="Mes recettes"
        aside={
          <button type="button" className="link" onClick={() => setEditing(null)}>
            Ajouter
          </button>
        }
      >
        <div className="list">
          {(recipes ?? []).map((r) => (
            <div className="row" key={r.id}>
              <div className="grow">
                <span className="t">{r.name}</span>
                <div className="sub">
                  {r.note ? `${r.note} · ` : ""}
                  {r.ingredients.map((i) => i.name).join(", ")}
                </div>
              </div>
              <button type="button" className="icon-btn" onClick={() => setEditing(r)} aria-label={`Modifier : ${r.name}`}>
                <IconPen />
              </button>
            </div>
          ))}
          {recipes && !recipes.length && <p className="empty">Aucune recette. Ajoute ton premier plat simple.</p>}
        </div>
      </Slip>

      <MealSlotSheet target={slot} onClose={() => setSlot(null)} />
      <RecipeSheet open={editing !== undefined} recipe={editing ?? null} onClose={() => setEditing(undefined)} />
    </>
  );
}
