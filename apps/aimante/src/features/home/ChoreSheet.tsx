import { type FormEvent, useEffect, useState } from "react";
import { saveChore, saveRoom, deleteRoom } from "../../data/actions";
import { useLive } from "../../data/live";
import { choresRepo, roomsRepo } from "../../data/repositories";
import type { Chore, Effort } from "../../domain/types";
import { IconClose } from "../../ui/icons";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";

const EFFORTS: [Effort, string][] = [
  [1, "5 min"],
  [2, "15 min"],
  [3, "30 min"],
];

interface ChoreSheetProps {
  open: boolean;
  /** null = nouvelle tâche */
  chore: Chore | null;
  onClose: () => void;
}

export function ChoreSheet({ open, chore, onClose }: ChoreSheetProps) {
  const toast = useToast();
  const rooms = useLive(async () => (await roomsRepo.getAll()).sort((a, b) => a.order - b.order));
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [everyDays, setEveryDays] = useState("7");
  const [effort, setEffort] = useState<Effort>(1);

  useEffect(() => {
    if (!open) return;
    setName(chore?.name ?? "");
    setRoomId(chore?.roomId ?? "");
    setEveryDays(String(chore?.everyDays ?? 7));
    setEffort(chore?.effort ?? 1);
  }, [open, chore]);

  const room = roomId || rooms?.[0]?.id || "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !room) return;
    await saveChore({ id: chore?.id, name, roomId: room, everyDays: Number(everyDays), effort });
    toast(chore ? "Tâche modifiée." : "Tâche ajoutée.");
    onClose();
  }

  async function remove() {
    if (!chore) return;
    await choresRepo.remove(chore.id);
    toast("Tâche supprimée.");
    onClose();
  }

  return (
    <Sheet open={open} title={chore ? "Modifier la tâche" : "Nouvelle tâche maison"} onClose={onClose}>
      <form className="form c-green" onSubmit={submit}>
        <div className="field">
          <label htmlFor="c-name">Tâche</label>
          <input id="c-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="off" />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="c-room">Pièce</label>
            <select id="c-room" value={room} onChange={(e) => setRoomId(e.target.value)}>
              {(rooms ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="c-every">Tous les … jours</label>
            <input
              id="c-every"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              value={everyDays}
              onChange={(e) => setEveryDays(e.target.value)}
              required
            />
          </div>
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
            Effort
          </legend>
          <div className="seg">
            {EFFORTS.map(([v, l]) => (
              <label key={v}>
                <input type="radio" name="effort" checked={effort === v} onChange={() => setEffort(v)} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="btn primary">
          {chore ? "Enregistrer" : "Ajouter"}
        </button>
      </form>
      {chore && (
        <button type="button" className="btn ghost danger" onClick={remove}>
          Supprimer cette tâche
        </button>
      )}
    </Sheet>
  );
}

export function RoomsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const rooms = useLive(async () => (await roomsRepo.getAll()).sort((a, b) => a.order - b.order));
  const chores = useLive(choresRepo.getAll);
  const [newName, setNewName] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await saveRoom({ name: newName });
    setNewName("");
  }

  async function remove(id: string, name: string) {
    const n = (chores ?? []).filter((c) => c.roomId === id).length;
    if (n > 0) {
      toast(`${name} contient encore ${n} tâche${n > 1 ? "s" : ""}. Déplace-les ou supprime-les d'abord.`);
      return;
    }
    await deleteRoom(id);
  }

  return (
    <Sheet open={open} title="Mes pièces" onClose={onClose}>
      <p className="small muted">Renomme, ajoute ou retire des pièces. Une pièce doit être vide pour être retirée.</p>
      <div className="list">
        {(rooms ?? []).map((r) => (
          <div className="row" key={r.id}>
            <input
              type="text"
              defaultValue={r.name}
              aria-label={`Nom de la pièce ${r.name}`}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== r.name) saveRoom({ id: r.id, name: v });
                else e.target.value = r.name;
              }}
            />
            <button type="button" className="icon-btn" onClick={() => remove(r.id, r.name)} aria-label={`Retirer ${r.name}`}>
              <IconClose />
            </button>
          </div>
        ))}
      </div>
      <form className="add c-green" onSubmit={add}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nouvelle pièce (Entrée, Balcon…)"
          aria-label="Nouvelle pièce"
          autoComplete="off"
        />
        <button type="submit" className="btn primary">
          Ajouter
        </button>
      </form>
    </Sheet>
  );
}
