import { addDays, greeting, longDate, weekDays, weekdayShort } from "../../domain/dates";
import { dropsToNextStage, MAX_STAGE, stageFor } from "../../domain/points";
import type { Habit, Moment } from "../../domain/types";
import { useLive } from "../../data/live";
import { getDayLogs, getMealPlan, getSettings, habitsRepo, recipesRepo } from "../../data/repositories";
import { IconSettings } from "../../ui/icons";
import { Plant } from "../../ui/Plant";
import { ScreenHeader, Slip } from "../../ui/Slip";
import type { TabId } from "../../ui/TabBar";
import { useToday } from "../../ui/useToday";

const MOMENTS: [Moment, string][] = [
  ["matin", "Matin"],
  ["journee", "Dans la journée"],
  ["soir", "Soir"],
];

export function TodayScreen({ onOpenSettings, goTo }: { onOpenSettings: () => void; goTo: (t: TabId) => void }) {
  const t = useToday();
  const week = weekDays(t);
  const settings = useLive(getSettings);
  const logs = useLive(() => getDayLogs(week[0]!, week[6]!), [t]);
  const habits = useLive(habitsRepo.getAll);
  const recipes = useLive(recipesRepo.getAll);
  const meals = useLive(() => getMealPlan(t, t), [t]);

  const drops = settings?.totalDrops ?? 0;
  const stage = stageFor(drops);
  const toNext = dropsToNextStage(drops);
  const activeDays = new Set((logs ?? []).filter((l) => l.drops > 0).map((l) => l.date));
  const mealLabel = (slot: "midi" | "soir") => {
    const m = meals?.find((x) => x.slot === slot);
    if (!m) return null;
    return m.text ?? recipes?.find((r) => r.id === m.recipeId)?.name ?? null;
  };

  return (
    <>
      <ScreenHeader
        eyebrow={longDate(t)}
        title={`${greeting(new Date().getHours())}.`}
        actions={
          <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Réglages et sauvegarde">
            <IconSettings />
          </button>
        }
      />

      <Slip color="green">
        <div className="grow-card">
          <Plant stage={stage} />
          <div>
            <p className="hand">{stage >= MAX_STAGE ? "Ta plante a fleuri." : "Ta plante pousse quand tu avances."}</p>
            <p className="small muted" style={{ marginTop: 4 }}>
              <span className="num">{drops}</span> goutte{drops > 1 ? "s" : ""}
              {toNext !== null && (
                <>
                  {" "}
                  · encore <span className="num">{toNext}</span> avant la prochaine feuille
                </>
              )}
              . Elle ne fane jamais, même si tu fais une pause.
            </p>
            <ul className="week" aria-label="Jours actifs cette semaine">
              {week.map((d) => (
                <li key={d} className={d === t ? "today" : undefined}>
                  <b className={activeDays.has(d) ? "on" : undefined} />
                  <span aria-hidden="true">{weekdayShort(d)}</span>
                  <span className="sr-only">
                    {longDate(d)} : {activeDays.has(d) ? "au moins une action" : "pas encore d'action"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Slip>

      <Slip color="blue" title="Mes routines">
        {MOMENTS.map(([moment, label]) => {
          const list = (habits ?? []).filter((h) => h.moment === moment).sort((a, b) => a.order - b.order);
          if (!list.length) return null;
          return (
            <div key={moment}>
              <h3 className="eyebrow group-label">{label}</h3>
              <div className="list">
                {list.map((h: Habit) => (
                  <div className="row" key={h.id}>
                    <div className="grow">
                      <span className="anchor">Après {h.anchor}</span>
                      <span className="t">{h.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </Slip>

      <Slip
        color="red"
        title="Au menu"
        aside={
          <button type="button" className="link" onClick={() => goTo("meals")}>
            Planifier
          </button>
        }
      >
        <div className="grid2">
          {(["midi", "soir"] as const).map((slot) => {
            const label = mealLabel(slot);
            return (
              <div key={slot} className={`meal ${label ? "" : "empty-slot"}`}>
                <small>{slot}</small>
                {label ?? "Rien de prévu"}
              </div>
            );
          })}
        </div>
      </Slip>

      <p className="small muted" style={{ textAlign: "center" }}>
        Demain : {longDate(addDays(t, 1))}
      </p>
    </>
  );
}
