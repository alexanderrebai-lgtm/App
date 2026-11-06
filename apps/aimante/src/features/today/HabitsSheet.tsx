import { type FormEvent, useState } from "react";
import { saveHabit } from "../../data/actions";
import { useLive } from "../../data/live";
import { habitsRepo } from "../../data/repositories";
import type { Habit, Moment } from "../../domain/types";
import { IconClose, IconPen } from "../../ui/icons";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";
import { useToday } from "../../ui/useToday";

export const MOMENTS: [Moment, string][] = [
  ["matin", "Matin"],
  ["journee", "Journée"],
  ["soir", "Soir"],
];

/** Au-delà, l'habitude risque de ne plus tenir en 2 minutes. */
const LONG_ACTION = 55;

const EMPTY = { id: undefined as string | undefined, moment: "matin" as Moment, anchor: "", action: "" };

export function HabitsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useToday();
  const toast = useToast();
  const habits = useLive(habitsRepo.getAll);
  const [form, setForm] = useState(EMPTY);
  const editing = form.id !== undefined;

  const list = [...(habits ?? [])].sort(
    (a, b) =>
      MOMENTS.findIndex(([m]) => m === a.moment) - MOMENTS.findIndex(([m]) => m === b.moment) || a.order - b.order,
  );

  const close = () => {
    setForm(EMPTY);
    onClose();
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.anchor.trim() || !form.action.trim()) return;
    await saveHabit(form, t);
    toast(editing ? "Routine modifiée." : "Routine ajoutée. Commence petit.");
    setForm(EMPTY);
  }

  const edit = (h: Habit) => setForm({ id: h.id, moment: h.moment, anchor: h.anchor, action: h.action });

  async function remove(h: Habit) {
    await habitsRepo.remove(h.id);
    if (form.id === h.id) setForm(EMPTY);
    toast("Routine retirée.");
  }

  return (
    <Sheet open={open} title="Mes routines" onClose={close}>
      <p className="small muted">
        Accroche chaque nouvelle habitude à une chose que tu fais déjà tous les jours. Garde-la si petite qu'elle prend
        moins de 2 minutes. Mieux vaut une ou deux routines qui tiennent que dix qui lâchent.
      </p>

      <div className="list">
        {list.map((h) => (
          <div className="row" key={h.id}>
            <div className="grow">
              <span className="anchor">
                {MOMENTS.find(([m]) => m === h.moment)?.[1]} · après {h.anchor}
              </span>
              <span className="t">{h.action}</span>
            </div>
            <button type="button" className="icon-btn" onClick={() => edit(h)} aria-label={`Modifier : ${h.action}`}>
              <IconPen />
            </button>
            <button type="button" className="icon-btn" onClick={() => remove(h)} aria-label={`Supprimer : ${h.action}`}>
              <IconClose />
            </button>
          </div>
        ))}
        {!list.length && <p className="empty">Aucune routine pour l'instant.</p>}
      </div>

      <form className="panel form c-blue" onSubmit={submit}>
        <h3>{editing ? "Modifier la routine" : "Nouvelle routine"}</h3>
        <div className="field">
          <label htmlFor="h-anchor">Après… (une chose que tu fais déjà)</label>
          <div className="anchor-line">
            <span aria-hidden="true">Après</span>
            <input
              id="h-anchor"
              type="text"
              value={form.anchor}
              onChange={(e) => setForm({ ...form, anchor: e.target.value })}
              placeholder="je me brosse les dents"
              autoComplete="off"
              required
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="h-action">…je (la nouvelle habitude, en moins de 2 minutes)</label>
          <div className="anchor-line">
            <span aria-hidden="true">je…</span>
            <input
              id="h-action"
              type="text"
              value={form.action}
              onChange={(e) => setForm({ ...form, action: e.target.value })}
              placeholder="range 5 objets dans le salon"
              autoComplete="off"
              required
            />
          </div>
          {form.action.length > LONG_ACTION && (
            <p className="hint warn">C'est un peu long. Une version plus petite tiendra mieux : tu pourras grandir après.</p>
          )}
        </div>
        <fieldset className="seg" aria-label="Moment de la journée">
          {MOMENTS.map(([m, label]) => (
            <label key={m}>
              <input
                type="radio"
                name="moment"
                value={m}
                checked={form.moment === m}
                onChange={() => setForm({ ...form, moment: m })}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="btns grow">
          <button type="submit" className="btn primary">
            {editing ? "Enregistrer" : "Ajouter la routine"}
          </button>
          {editing && (
            <button type="button" className="btn" onClick={() => setForm(EMPTY)}>
              Annuler
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
