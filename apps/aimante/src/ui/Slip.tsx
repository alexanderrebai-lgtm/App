import type { ReactNode } from "react";

export type MagnetColor = "blue" | "green" | "red" | "yellow" | "violet";

interface SlipProps {
  color: MagnetColor;
  title?: ReactNode;
  /** Élément à droite du titre : lien, compteur… */
  aside?: ReactNode;
  children?: ReactNode;
}

/** Fiche blanche tenue par un aimant de couleur. */
export function Slip({ color, title, aside, children }: SlipProps) {
  return (
    <section className={`slip c-${color}`}>
      <span className="mag" aria-hidden="true" />
      {(title || aside) && (
        <div className="slip-head">
          {title && <h2>{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function ScreenHeader({ eyebrow, title, actions }: { eyebrow: string; title: string; actions?: ReactNode }) {
  return (
    <header className="top">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      <div className="top-actions">{actions}</div>
    </header>
  );
}
