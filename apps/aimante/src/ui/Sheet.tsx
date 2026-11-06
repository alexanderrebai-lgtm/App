import { type ReactNode, useEffect, useId, useRef } from "react";
import { IconClose } from "./icons";

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Panneau qui monte du bas de l'écran. S'appuie sur <dialog> : le focus reste
 * dans le panneau, Échap le ferme, et le lecteur d'écran l'annonce.
 */
export function Sheet({ open, title, onClose, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // Toucher le fond sombre ferme le panneau.
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="sheet-body">
          <div className="sheet-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">
              <IconClose />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
