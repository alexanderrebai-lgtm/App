import { MAX_STAGE } from "../domain/points";

/** Dessin de la plante selon son palier (0 = graine, 7 = fleur). */
export function Plant({ stage }: { stage: number }) {
  const h = 6 + stage * 7.5;
  const top = 76 - h;
  const leaves = Array.from({ length: stage }, (_, i) => {
    const y = 76 - (i + 1) * (h / (stage + 0.6));
    const left = i % 2 === 0;
    const cx = left ? 33 : 47;
    return (
      <ellipse
        key={i}
        cx={cx}
        cy={y.toFixed(1)}
        rx="8"
        ry="3.6"
        transform={`rotate(${left ? -28 : 28} ${cx} ${y.toFixed(1)})`}
        fill="var(--m-green)"
      />
    );
  });

  return (
    <svg className="plant" viewBox="0 0 80 100" aria-hidden="true">
      {stage === 0 ? (
        <circle cx="40" cy="74" r="3" fill="var(--m-green)" />
      ) : (
        <path d={`M40 77 L40 ${top.toFixed(1)}`} stroke="var(--m-green)" strokeWidth="2.6" strokeLinecap="round" />
      )}
      {leaves}
      {stage >= MAX_STAGE && (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={(40 + 6 * Math.cos((a * Math.PI) / 180)).toFixed(1)}
              cy={(top - 2 + 6 * Math.sin((a * Math.PI) / 180)).toFixed(1)}
              r="4.2"
              fill="var(--m-yellow)"
            />
          ))}
          <circle cx="40" cy={top - 2} r="3" fill="var(--m-red)" />
        </g>
      )}
      <path d="M24 78 H56 L52 98 H28 Z" fill="var(--m-red)" />
      <rect x="21" y="75" width="38" height="6" rx="2" fill="var(--m-red)" />
      <rect x="21" y="75" width="38" height="2.5" rx="1" fill="rgba(255,255,255,.25)" />
    </svg>
  );
}
