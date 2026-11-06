import { IconCheck } from "./icons";

interface CheckProps {
  checked: boolean;
  /** Ce que la case coche, pour le lecteur d'écran : « Faire le lit ». */
  label: string;
  onToggle: () => void;
}

/** Grande case à cocher (44 px), annoncée comme un bouton à bascule. */
export function Check({ checked, label, onToggle }: CheckProps) {
  return (
    <button type="button" className="check" aria-pressed={checked} aria-label={label} onClick={onToggle}>
      <span className="box">
        <IconCheck />
      </span>
    </button>
  );
}
