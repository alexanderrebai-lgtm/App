import { dayOfMonth, longDate } from "../../domain/dates";
import type { AgendaEvent } from "../../domain/types";
import { useLive } from "../../data/live";
import { backlogRepo, eventsRepo, memosRepo } from "../../data/repositories";
import { ScreenHeader, Slip } from "../../ui/Slip";

const KIND: Record<AgendaEvent["kind"], string> = {
  rdv: "rendez-vous",
  activite: "activité",
  "a-faire": "à payer / à faire",
};

function repeatLabel(e: AgendaEvent): string {
  if (e.repeat === "weekly") return "chaque semaine";
  if (e.repeat === "monthly") {
    const d = dayOfMonth(e.date);
    return `chaque mois, le ${d === 1 ? "1er" : d}`;
  }
  return longDate(e.date);
}

export function AgendaScreen() {
  const events = useLive(async () => (await eventsRepo.getAll()).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "")));
  const backlog = useLive(backlogRepo.getAll);
  const memos = useLive(memosRepo.getAll);

  return (
    <>
      <ScreenHeader eyebrow="Rendez-vous, activités, rappels" title="Agenda" />
      <Slip color="violet" title="Mes rendez-vous et rappels">
        <div className="list">
          {(events ?? []).map((e) => (
            <div className="row" key={e.id}>
              <span className="time">{e.time ?? "—"}</span>
              <div className="grow">
                <span className="t">{e.title}</span>
                <div className="sub">
                  {repeatLabel(e)} · {KIND[e.kind]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Slip>
      <Slip color="violet" title="À prévoir" aside={<span className="eyebrow">sans date pour l'instant</span>}>
        <div className="list">
          {(backlog ?? [])
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((b) => (
              <div className="row" key={b.id}>
                <span className="t grow">{b.title}</span>
              </div>
            ))}
        </div>
      </Slip>
      <Slip color="yellow" title="À ne pas oublier">
        <ul className="notes" style={{ margin: 0, listStyle: "none", paddingLeft: 0 }}>
          {(memos ?? [])
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((m) => (
              <li className="note" key={m.id}>
                <span className="mag c-red" aria-hidden="true" />
                {m.text}
              </li>
            ))}
        </ul>
      </Slip>
    </>
  );
}
