import { useState } from "react";
import { addDays, dayOfMonth, mondayOf, shortDate, weekDays, weekdayShort } from "../../domain/dates";
import { useLive } from "../../data/live";
import { getMealPlan, recipesRepo } from "../../data/repositories";
import { IconNext, IconPrev } from "../../ui/icons";
import { ScreenHeader, Slip } from "../../ui/Slip";
import { useToday } from "../../ui/useToday";

export function MealsScreen() {
  const t = useToday();
  const [weekStart, setWeekStart] = useState(() => mondayOf(t));
  const days = weekDays(weekStart);
  const recipes = useLive(async () => (await recipesRepo.getAll()).sort((a, b) => a.name.localeCompare(b.name, "fr")));
  const plan = useLive(() => getMealPlan(days[0]!, days[6]!), [weekStart]);

  const label = (date: string, slot: "midi" | "soir") => {
    const m = plan?.find((x) => x.date === date && x.slot === slot);
    if (!m) return null;
    return m.text ?? recipes?.find((r) => r.id === m.recipeId)?.name ?? null;
  };
  const planned = days.reduce((n, d) => n + (["midi", "soir"] as const).filter((s) => label(d, s)).length, 0);

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
            <div key={d} className={`day ${d === t ? "is-today" : ""}`} aria-current={d === t ? "date" : undefined}>
              <div className="dn">
                {weekdayShort(d)}
                <small>{dayOfMonth(d)}</small>
              </div>
              {(["midi", "soir"] as const).map((s) => {
                const l = label(d, s);
                return (
                  <div key={s} className={`meal ${l ? "" : "empty-slot"}`}>
                    <small>{s}</small>
                    {l ?? "—"}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="tip">Astuce : les plats « double portion » se cuisinent une fois et font aussi le repas du lendemain midi.</p>
      </Slip>

      <Slip color="red" title="Mes recettes">
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
            </div>
          ))}
        </div>
      </Slip>
    </>
  );
}
