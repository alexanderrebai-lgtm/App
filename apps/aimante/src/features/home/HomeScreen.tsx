import { choreStatus, EFFORT_MINUTES } from "../../domain/chores";
import { useLive } from "../../data/live";
import { choresRepo, roomsRepo } from "../../data/repositories";
import { ScreenHeader, Slip } from "../../ui/Slip";
import { useToday } from "../../ui/useToday";

export function HomeScreen() {
  const t = useToday();
  const rooms = useLive(roomsRepo.getAll);
  const chores = useLive(choresRepo.getAll);

  return (
    <>
      <ScreenHeader eyebrow="Tâches ménagères" title="La maison" />
      <Slip color="green" title="Toutes les pièces">
        <p className="small muted">La barre se remplit à mesure que la tâche approche. Vert : propre. Orange : bientôt. Rouge : en retard.</p>
        {(rooms ?? [])
          .sort((a, b) => a.order - b.order)
          .map((room) => {
            // Dans chaque pièce, la plus urgente en haut.
            const list = (chores ?? [])
              .filter((c) => c.roomId === room.id)
              .map((c) => ({ c, s: choreStatus(c, t) }))
              .sort((a, b) => a.s.daysLeft - b.s.daysLeft || a.c.name.localeCompare(b.c.name, "fr"));
            if (!list.length) return null;
            return (
              <div key={room.id}>
                <h3 className="room-h">{room.name}</h3>
                <div className="list">
                  {list.map(({ c, s }) => {
                    const width = Math.min(100, Math.max(4, s.ratio * 100));
                    return (
                      <div className="row" key={c.id}>
                        <div className="grow">
                          <div className="slip-head" style={{ gap: 6 }}>
                            <span className="t">{c.name}</span>
                            <span className={`small ${s.daysLeft < 0 ? "late" : "muted"}`}>{s.label}</span>
                          </div>
                          <div className="sub">
                            {c.everyDays === 1 ? "tous les jours" : `tous les ${c.everyDays} jours`} ·{" "}
                            <span className="effort" role="img" aria-label={`effort ${c.effort} sur 3`}>
                              {[1, 2, 3].map((i) => (
                                <span key={i} className={i <= c.effort ? "on" : undefined} />
                              ))}
                            </span>
                            {EFFORT_MINUTES[c.effort]} min
                          </div>
                          <div className="fresh" aria-hidden="true">
                            <i className={s.freshness} style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </Slip>
    </>
  );
}
