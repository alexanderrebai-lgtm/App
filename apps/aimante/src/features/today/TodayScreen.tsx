import { type FormEvent, useEffect, useRef, useState } from "react";
import { choreStatus, dueChores, EFFORT_MINUTES } from "../../domain/chores";
import { addDays, greeting, longDate, weekDays, weekdayShort } from "../../domain/dates";
import { dropsToNextStage, MAX_STAGE, stageFor } from "../../domain/points";
import {
  bedtimeCountdown,
  formatClock,
  formatDuration,
  isCarriedOver,
  MINIMUM,
  missedYesterday,
  pickFlashChores,
  tasksForDay,
} from "../../domain/today";
import type { Habit, Task, TaskKind } from "../../domain/types";
import {
  addTask,
  dismissWelcomeBack,
  resetOverdueChores,
  setHardMode,
  toggleChore,
  toggleHabit,
  toggleMinimum,
  toggleTask,
} from "../../data/actions";
import { useLive } from "../../data/live";
import {
  choresRepo,
  getDayLogs,
  getMealPlan,
  getSettings,
  habitsRepo,
  recipesRepo,
  roomsRepo,
  tasksRepo,
} from "../../data/repositories";
import { Check } from "../../ui/Check";
import { startFlashSession } from "../../ui/flashSession";
import { IconClose, IconPlus, IconSettings } from "../../ui/icons";
import { Plant } from "../../ui/Plant";
import { ScreenHeader, Slip } from "../../ui/Slip";
import type { TabId } from "../../ui/TabBar";
import { useToast } from "../../ui/Toast";
import { useNow } from "../../ui/useNow";
import { useToday } from "../../ui/useToday";
import { MealSlotSheet, type SlotRef } from "../meals/MealSlotSheet";
import { HabitsSheet, MOMENTS } from "./HabitsSheet";

interface Props {
  onOpenSettings: () => void;
  goTo: (t: TabId) => void;
}

export function TodayScreen({ onOpenSettings, goTo }: Props) {
  const t = useToday();
  const now = useNow();
  const toast = useToast();
  const week = weekDays(t);
  const yesterday = addDays(t, -1);
  const [habitsOpen, setHabitsOpen] = useState(false);
  const [slot, setSlot] = useState<SlotRef | null>(null);

  const settings = useLive(getSettings);
  // La semaine pour les pastilles, plus hier (pour « raté hier » le lundi).
  const from = yesterday < week[0]! ? yesterday : week[0]!;
  const logs = useLive(() => getDayLogs(from, week[6]!), [t]);
  const habits = useLive(habitsRepo.getAll);
  const tasks = useLive(tasksRepo.getAll);
  const chores = useLive(choresRepo.getAll);
  const rooms = useLive(roomsRepo.getAll);
  const recipes = useLive(recipesRepo.getAll);
  const meals = useLive(() => getMealPlan(t, t), [t]);

  const log = logs?.find((l) => l.date === t);
  const ylog = logs?.find((l) => l.date === yesterday);
  const hard = log?.hardMode ?? false;

  /* ---------- Plante ---------- */
  const drops = settings?.totalDrops ?? 0;
  const stage = stageFor(drops);
  const toNext = dropsToNextStage(drops);
  const activeDays = new Set((logs ?? []).filter((l) => l.drops > 0).map((l) => l.date));
  const prevStage = useRef<number | null>(null);
  const [grew, setGrew] = useState(false);
  useEffect(() => {
    if (!settings) return;
    if (prevStage.current !== null && stage > prevStage.current) {
      setGrew(true);
      toast(stage >= MAX_STAGE ? "Ta plante a fleuri. Tout ce chemin, c'est toi." : "Une nouvelle feuille a poussé.");
    }
    prevStage.current = stage;
  }, [stage, settings, toast]);

  /* ---------- Tâches ---------- */
  const todays = tasksForDay(tasks ?? [], t);
  const mandatory = todays.filter((x) => x.kind === "obligatoire");
  const optional = todays.filter((x) => x.kind === "secondaire");
  const shownTasks = hard ? mandatory : todays;
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<TaskKind>("obligatoire");
  async function submitTask(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await addTask(title, kind, t);
    setTitle("");
  }

  /* ---------- Maison ---------- */
  const doneChoreIds = log?.chores ?? [];
  const urgent = dueChores(chores ?? [], t).slice(0, 4);
  const doneChores = (chores ?? []).filter((c) => doneChoreIds.includes(c.id));
  const roomName = (id: string) => rooms?.find((r) => r.id === id)?.name ?? "";

  /* ---------- Repas ---------- */
  const mealLabel = (slot: "midi" | "soir") => {
    const m = meals?.find((x) => x.slot === slot);
    if (!m) return null;
    return m.text ?? recipes?.find((r) => r.id === m.recipeId)?.name ?? null;
  };

  /* ---------- Heure de coucher ---------- */
  const bedtime = settings?.bedtime ?? null;
  const toBed = bedtimeCountdown(now, bedtime);

  const welcome = settings?.welcomeBack?.on === t ? settings.welcomeBack : null;

  async function onMinimum(id: string) {
    const r = await toggleMinimum(id, t);
    if (r.on && r.all) toast("Minimum tenu. Faire peu, c'est déjà tenir.");
  }

  function quickFive() {
    const picked = pickFlashChores(chores ?? [], 5, t, doneChoreIds);
    startFlashSession(5, picked.map((c) => c.id));
    goTo("home");
  }

  async function restartChores() {
    const n = await resetOverdueChores(t);
    await dismissWelcomeBack();
    toast(n ? `${n} tâche${n > 1 ? "s" : ""} remise${n > 1 ? "s" : ""} à plat. On repart léger.` : "La maison est déjà à jour.");
  }

  const taskRow = (x: Task) => {
    const done = x.doneOn !== null;
    return (
      <div className={`row ${done ? "done" : ""}`} key={x.id}>
        <Check checked={done} label={x.title} onToggle={() => toggleTask(x.id, t)} />
        <div className="grow">
          <span className="t">{x.title}</span> {isCarriedOver(x, t) && <span className="tag warn">reportée</span>}
        </div>
        <button type="button" className="icon-btn" onClick={() => tasksRepo.remove(x.id)} aria-label={`Supprimer : ${x.title}`}>
          <IconClose />
        </button>
      </div>
    );
  };

  return (
    <>
      <ScreenHeader
        eyebrow={longDate(t)}
        title={`${greeting(now.getHours())}.`}
        actions={
          <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Réglages et sauvegarde">
            <IconSettings />
          </button>
        }
      />

      {welcome && (
        <section className="notice c-blue" aria-labelledby="welcome-h">
          <h2 id="welcome-h">Content de te revoir.</h2>
          <p className="small">
            Ça fait {welcome.daysAway} jours. C'est normal, la vie arrive. Ta plante est toujours là, rien n'est perdu.
            Pour reprendre, une journée minimum suffit.
          </p>
          <div className="btns">
            <button
              type="button"
              className="btn primary"
              onClick={async () => {
                await setHardMode(true, t);
                await dismissWelcomeBack();
              }}
            >
              Journée minimum
            </button>
            <button type="button" className="btn" onClick={restartChores}>
              Remettre la maison à plat
            </button>
            <button type="button" className="link" onClick={() => dismissWelcomeBack()}>
              Reprendre normalement
            </button>
          </div>
        </section>
      )}

      <Slip color="green">
        <div className="grow-card">
          <Plant stage={stage} grew={grew} />
          <div>
            <p className="hand">{stage >= MAX_STAGE ? "Ta plante a fleuri." : "Ta plante pousse quand tu avances."}</p>
            <p className="small muted" style={{ marginTop: 4 }} aria-live="polite">
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

      <div className={`hardbar ${hard ? "on" : ""}`}>
        {hard ? (
          <span className="small">
            <b>Journée difficile.</b> On garde l'essentiel : faire peu vaut mieux que ne rien faire.
          </span>
        ) : (
          <span className="small">Journée difficile ? Garde seulement l'essentiel.</span>
        )}
        <button type="button" className="btn" onClick={() => setHardMode(!hard, t)} aria-pressed={hard}>
          {hard ? "Revenir au normal" : "Journée difficile"}
        </button>
      </div>

      {hard ? (
        <Slip color="blue" title="Le minimum du jour" aside={<span className="eyebrow num">{log?.minimum.length ?? 0}/3</span>}>
          <div className="list">
            {MINIMUM.map((m) => {
              const on = log?.minimum.includes(m.id) ?? false;
              return (
                <div className={`row ${on ? "done" : ""}`} key={m.id}>
                  <Check checked={on} label={m.label} onToggle={() => onMinimum(m.id)} />
                  <span className="t grow">{m.label}</span>
                  {m.id === "maison" && !on && (
                    <button type="button" className="link" onClick={quickFive}>
                      Choisis pour moi
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Slip>
      ) : (
        <Slip
          color="blue"
          title="Mes routines"
          aside={
            <button type="button" className="link" onClick={() => setHabitsOpen(true)}>
              Modifier
            </button>
          }
        >
          {toBed !== null && bedtime && (
            <div className="notice c-violet" role="status">
              <p className="small">
                {toBed > 0 ? (
                  <>
                    <b>Coucher prévu à {formatClock(bedtime)}</b>, dans {formatDuration(toBed)}. Pose le téléphone 30 min
                    avant : ton matin te dira merci.
                  </>
                ) : (
                  <>
                    <b>C'est l'heure d'aller dormir.</b> Le reste peut attendre demain.
                  </>
                )}
              </p>
            </div>
          )}
          {MOMENTS.map(([moment, label]) => {
            const list = (habits ?? []).filter((h) => h.moment === moment).sort((a, b) => a.order - b.order);
            if (!list.length) return null;
            return (
              <div key={moment}>
                <h3 className="eyebrow group-label">{label}</h3>
                <div className="list">
                  {list.map((h: Habit) => {
                    const on = log?.habits.includes(h.id) ?? false;
                    const missed = missedYesterday(h, ylog, log);
                    return (
                      <div className={`row ${on ? "done" : ""}`} key={h.id}>
                        <Check checked={on} label={`Après ${h.anchor}, ${h.action}`} onToggle={() => toggleHabit(h.id, t)} />
                        <div className="grow">
                          <span className="anchor">Après {h.anchor}</span>
                          <span className="t">{h.action}</span>
                          {missed && (
                            <>
                              <br />
                              <span className="miss">Raté hier · on ne rate pas deux fois</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!(habits ?? []).length && <p className="empty">Aucune routine. Ajoute-en une avec « Modifier ».</p>}
        </Slip>
      )}

      <Slip
        color="blue"
        title="À faire aujourd'hui"
        aside={
          <span className="eyebrow num">
            {shownTasks.filter((x) => x.doneOn).length}/{shownTasks.length}
          </span>
        }
      >
        <div>
          <h3 className="eyebrow">Obligatoire</h3>
          <div className="list">
            {mandatory.map(taskRow)}
            {!mandatory.length && <p className="empty">Rien d'obligatoire pour l'instant.</p>}
          </div>
        </div>
        {!hard && (
          <div>
            <h3 className="eyebrow">Si j'ai le temps</h3>
            <div className="list">
              {optional.map(taskRow)}
              {!optional.length && <p className="empty">Rien de prévu.</p>}
            </div>
          </div>
        )}
        <form className="add stack" onSubmit={submitTask}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ajouter une tâche…"
            aria-label="Nouvelle tâche"
            autoComplete="off"
            enterKeyHint="done"
          />
          <select value={kind} onChange={(e) => setKind(e.target.value as TaskKind)} aria-label="Type de tâche">
            <option value="obligatoire">Obligatoire</option>
            <option value="secondaire">Si j'ai le temps</option>
          </select>
          <button type="submit" className="btn primary" aria-label="Ajouter la tâche" style={{ paddingInline: 12 }}>
            <IconPlus width={20} height={20} />
          </button>
        </form>
      </Slip>

      <Slip
        color="green"
        title="La maison"
        aside={
          <button type="button" className="link" onClick={() => goTo("home")}>
            Tout voir
          </button>
        }
      >
        <div className="list">
          {urgent.map((c) => (
            <div className="row" key={c.id}>
              <Check checked={false} label={c.name} onToggle={() => toggleChore(c.id, t)} />
              <div className="grow">
                <span className="t">{c.name}</span>
                <div className="sub">
                  {roomName(c.roomId)} · {EFFORT_MINUTES[c.effort]} min · {choreStatus(c, t).label}
                </div>
              </div>
            </div>
          ))}
          {doneChores.map((c) => (
            <div className="row done" key={c.id}>
              <Check checked label={c.name} onToggle={() => toggleChore(c.id, t)} />
              <div className="grow">
                <span className="t">{c.name}</span>
                <div className="sub">{roomName(c.roomId)}</div>
              </div>
            </div>
          ))}
          {!urgent.length && !doneChores.length && <p className="empty">Tout est à jour. Profite.</p>}
        </div>
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
          {(["midi", "soir"] as const).map((s) => {
            const label = mealLabel(s);
            return (
              <button type="button" key={s} className={`meal ${label ? "" : "empty-slot"}`} onClick={() => setSlot({ date: t, slot: s })}>
                <small>{s}</small>
                {label ?? "Choisir"}
              </button>
            );
          })}
        </div>
      </Slip>

      <HabitsSheet open={habitsOpen} onClose={() => setHabitsOpen(false)} />
      <MealSlotSheet target={slot} onClose={() => setSlot(null)} />
    </>
  );
}
