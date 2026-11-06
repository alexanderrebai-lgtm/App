import { useRef, useState } from "react";
import { BackupError, backupFileName, exportAll, importAll } from "../../data/backup";
import { db } from "../../data/db";
import { useLive } from "../../data/live";
import { getSettings, saveSettings } from "../../data/repositories";
import { today } from "../../domain/dates";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";

/** Partage le fichier (iPhone : « Enregistrer dans Fichiers »), sinon le télécharge. */
async function saveFile(name: string, text: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([text], name, { type: "application/json" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Sauvegarde Aimanté" });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // Partage impossible : on passe au téléchargement.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; data: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const settings = useLive(getSettings);
  const bedtime = settings?.bedtime ?? null;

  const close = () => {
    setPending(null);
    setError(null);
    onClose();
  };

  async function onExport() {
    setBusy(true);
    try {
      const backup = await exportAll(db);
      const result = await saveFile(backupFileName(today()), JSON.stringify(backup, null, 2));
      if (result !== "cancelled") toast("Sauvegarde prête. Garde le fichier en lieu sûr.");
    } finally {
      setBusy(false);
    }
  }

  async function onPick(file: File | undefined) {
    setError(null);
    if (!file) return;
    try {
      setPending({ name: file.name, data: JSON.parse(await file.text()) });
    } catch {
      setError("Ce fichier n'est pas lisible. Choisis un fichier .json exporté par Aimanté.");
    }
    if (input.current) input.current.value = "";
  }

  async function onConfirmImport() {
    if (!pending) return;
    setBusy(true);
    try {
      await importAll(db, pending.data);
      toast("Sauvegarde restaurée.");
      close();
    } catch (e) {
      setError(e instanceof BackupError ? e.message : "L'import a échoué. Tes données n'ont pas changé.");
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} title="Réglages" onClose={close}>
      <div className="panel c-violet">
        <h3>Heure de coucher</h3>
        <p className="small muted">
          Bien dormir aide tout le reste à tenir. Le soir, Aujourd'hui te rappelle l'heure visée, 2 h avant.
        </p>
        <div className="grid2" style={{ alignItems: "end" }}>
          <div className="field">
            <label htmlFor="s-bedtime">Je vise</label>
            <input
              id="s-bedtime"
              type="time"
              value={bedtime ?? ""}
              disabled={bedtime === null}
              onChange={(e) => e.target.value && saveSettings({ bedtime: e.target.value })}
            />
          </div>
          <button
            type="button"
            className="btn"
            aria-pressed={bedtime !== null}
            onClick={() => saveSettings({ bedtime: bedtime === null ? "23:00" : null })}
          >
            {bedtime === null ? "Activer" : "Désactiver"}
          </button>
        </div>
      </div>
      <div className="panel c-blue">
        <h3>Sauvegarde</h3>
        <p className="small muted">
          Tout est enregistré sur cet appareil, sans compte. Exporte de temps en temps un fichier de sauvegarde : il te
          permet de tout récupérer sur un autre téléphone.
        </p>
        <div className="btns">
          <button type="button" className="btn primary" onClick={onExport} disabled={busy}>
            Exporter mes données
          </button>
          <button type="button" className="btn" onClick={() => input.current?.click()} disabled={busy}>
            Importer une sauvegarde
          </button>
        </div>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        {error && (
          <p className="small" role="alert" style={{ color: "var(--bad)" }}>
            {error}
          </p>
        )}
        {pending && (
          <div className="panel" style={{ background: "var(--surface)" }} role="alertdialog" aria-label="Confirmer l'import">
            <p className="small">
              Remplacer toutes tes données actuelles par celles de <b>{pending.name}</b> ? Pense à exporter d'abord si tu
              veux les garder.
            </p>
            <div className="btns">
              <button type="button" className="btn primary" onClick={onConfirmImport} disabled={busy}>
                Oui, remplacer
              </button>
              <button type="button" className="btn" onClick={() => setPending(null)} disabled={busy}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
