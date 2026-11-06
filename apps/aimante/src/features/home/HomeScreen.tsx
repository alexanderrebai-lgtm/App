import { useEffect, useRef, useState } from "react";
import { choreStatus, dueChores, EFFORT_MINUTES } from "../../domain/chores";
import { pickFlashChores } from "../../domain/today";
import type { Chore } from "../../domain/types";
import { toggleChore } from "../../data/actions";
import { useLive } from "../../data/live";
import { choresRepo, getDayLog, roomsRepo } from "../../data/repositories";
import { Check } from "../../ui/Check";
import { endFlashSession, type FlashSession, startFlashSession, useFlashSession } from "../../ui/flashSession";
import { IconPen } from "../../ui/icons";
import { ScreenHeader, Slip } from "../../ui/Slip";
import { useToast } from "../../ui/Toast";
import { useToday } from "../../ui/useToday";
import { ChoreSheet, RoomsSheet } from "./ChoreSheet";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function Effort({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="effort" role="img" aria-label={`effort ${level} sur 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= level ? "on" : undefined} />
      ))}
    </span>
  );
}

function SessionPanel({ session, chores, doneIds, roomName }: { session: FlashSession; chores: Chore[]; doneIds: string[]; roomName: (id: string) => string }) {
  const t = useToday();
  const toast = useToast();
  const left = () => Math.max(0, Math.round((session.endsAt - Date.now()) / 1000));
  const [secondsLeft, setSecondsLeft] = useState(left);
  const announced = useRef(left() === 0);

  useEffect(() => {
    const id = setInterval(() => {
      const s = left();
      setSecondsLeft(s);
      if (s === 0 && !announced.current) {
        announced.current = true;
        toast("Temps écoulé. Bravo d'avoir commencé.");
        navigator.vibrate?.(200);
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.endsAt]);

  const items = session.choreIds.map((id) => chores.find((c) => c.id === id)).filter((c): c is Chore => !!c);
  const over = secondsLeft === 0;

  return (
    <div className="session">
      <div className="slip-head" style={{ alignItems: "center" }}>
        <div>
          <div className="eyebrow">Session éclair · {session.minutes} min</div>
          <div className="countdown" role="timer" aria-label={`Temps restant : ${fmt(secondsLeft)}`}>
            {fmt(secondsLeft)}
          </div>
        </div>
        <button type="button" className="btn" onClick={endFlashSession}>
          Terminer
        </button>
      </div>
      {over && <p className="small"><b>Temps écoulé. Bravo d'avoir commencé.</b></p>}
      <div className="list">
        {items.map((c) => {
          const on = doneIds.includes(c.id);
          return (
            <div className={`row ${on ? "done" : ""}`} key={c.id}>
              <Check checked={on} label={c.name} onToggle={() => toggleChore(c.id, t)} />
              <div className="grow">
                <span className="t">{c.name}</span>
                <div className="sub">
                  {roomName(c.roomId)} · {EFFORT_MINUTES[c.effort]} min
                </div>
              </div>
            </div>
          );
        })}
        {!items.length && <p className="empty">Rien qui tienne dans ce temps : tout est propre, profite.</p>}
      </div>
    </div>
  );
}

export function HomeScreen() {
  const t = useToday();
  const rooms = useLive(async () => (await roomsRepo.getAll()).sort((a, b) => a.order - b.order));
  const chores = useLive(choresRepo.getAll);
  const log = useLive(() => getDayLog(t), [t]);
  const session = useFlashSession();
  const [editing, setEditing] = useState<Chore | null | undefined>(undefined);
  const [roomsOpen, setRoomsOpen] = useState(false);

  const doneIds = log?.chores ?? [];
  const due = dueChores(chores ?? [], t);
  const roomName = (id: string) => rooms?.find((r) => r.id === id)?.name ?? "";

  const start = (minutes: number) => {
    const picked = pickFlashChores(chores ?? [], minutes, t, doneIds);
    startFlashSession(minutes, picked.map((c) => c.id));
  };

  return (
    <>
      <ScreenHeader eyebrow="Tâches ménagères" title="La maison" />

      <Slip color="green" title="Session éclair" aside={<span className="eyebrow num">{due.length} à faire</span>}>
        {session ? (
          <SessionPanel session={session} chores={chores ?? []} doneIds={doneIds} roomName={roomName} />
        ) : (
          <>
            <p className="small muted">
              Choisis un temps. L'appli prend les tâches les plus urgentes qui tiennent dedans et lance le minuteur.
              Commencer est le plus dur : 5 minutes suffisent.
            </p>
            <div className="btns grow">
              {[5, 15, 30].map((n) => (
                <button type="button" key={n} className="btn primary" onClick={() => start(n)}>
                  {n} min
                </button>
              ))}
            </div>
          </>
        )}
      </Slip>

      <Slip
        color="green"
        title="Toutes les pièces"
        aside={
          <div className="btns" style={{ gap: 0 }}>
            <button type="button" className="link" onClick={() => setRoomsOpen(true)}>
              Pièces
            </button>
            <button type="button" className="link" onClick={() => setEditing(null)}>
              Ajouter
            </button>
          </div>
        }
      >
        <p className="small muted">
          La barre se remplit à mesure que la tâche approche. Vert : propre. Orange : bientôt. Rouge : en retard.
        </p>
        {(rooms ?? []).map((room) => {
          // Dans chaque pièce, la plus urgente en haut.
          const list = (chores ?? [])
            .filter((c) => c.roomId === room.id)
            .map((c) => ({ c, s: choreStatus(c, t) }))
            .sort((a, b) => a.s.daysLeft - b.s.daysLeft || a.c.name.localeCompare(b.c.name, "fr"));
          return (
            <div key={room.id}>
              <h3 className="room-h">{room.name}</h3>
              <div className="list">
                {list.map(({ c, s }) => {
                  const on = doneIds.includes(c.id);
                  const width = Math.min(100, Math.max(4, s.ratio * 100));
                  return (
                    <div className={`row ${on ? "done" : ""}`} key={c.id}>
                      <Check checked={on} label={c.name} onToggle={() => toggleChore(c.id, t)} />
                      <div className="grow">
                        <div className="slip-head" style={{ gap: 6 }}>
                          <span className="t">{c.name}</span>
                          <span className={`small ${s.daysLeft < 0 ? "late" : "muted"}`}>{s.label}</span>
                        </div>
                        <div className="sub">
                          {c.everyDays === 1 ? "tous les jours" : `tous les ${c.everyDays} jours`} · <Effort level={c.effort} />
                          {EFFORT_MINUTES[c.effort]} min
                        </div>
                        <div className="fresh" aria-hidden="true">
                          <i className={s.freshness} style={{ width: `${width}%` }} />
                        </div>
                      </div>
                      <button type="button" className="icon-btn" onClick={() => setEditing(c)} aria-label={`Modifier : ${c.name}`}>
                        <IconPen />
                      </button>
                    </div>
                  );
                })}
                {!list.length && <p className="empty">Aucune tâche dans cette pièce.</p>}
              </div>
            </div>
          );
        })}
      </Slip>

      <ChoreSheet open={editing !== undefined} chore={editing ?? null} onClose={() => setEditing(undefined)} />
      <RoomsSheet open={roomsOpen} onClose={() => setRoomsOpen(false)} />
    </>
  );
}
