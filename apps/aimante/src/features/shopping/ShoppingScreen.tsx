import { normalizeName } from "../../domain/aisles";
import { AISLES } from "../../domain/types";
import { useLive } from "../../data/live";
import { shoppingRepo, staplesRepo } from "../../data/repositories";
import { ScreenHeader, Slip } from "../../ui/Slip";

export function ShoppingScreen() {
  const items = useLive(shoppingRepo.getAll);
  const staples = useLive(staplesRepo.getAll);
  const toBuy = (items ?? []).filter((i) => !i.checked);
  const inList = new Set(toBuy.map((i) => normalizeName(i.name)));
  // Dans chaque rayon : à acheter d'abord, puis les articles cochés.
  const groups = AISLES.map(
    (a) =>
      [a, (items ?? []).filter((i) => i.aisle === a).sort((x, y) => Number(x.checked) - Number(y.checked) || x.createdAt - y.createdAt)] as const,
  ).filter(([, xs]) => xs.length);

  return (
    <>
      <ScreenHeader eyebrow="Rangée par rayon" title="Liste de courses" />
      <Slip color="yellow" title="Toujours à la maison">
        <ul className="chips" style={{ padding: 0, margin: 0, listStyle: "none" }}>
          {(staples ?? [])
            .sort((a, b) => a.order - b.order)
            .map((s) => {
              const on = inList.has(normalizeName(s.name));
              return (
                <li key={s.id} className={`chip ${on ? "in" : ""}`}>
                  {on ? "✓ " : ""}
                  {s.name}
                </li>
              );
            })}
        </ul>
      </Slip>
      <Slip color="yellow" title={`${toBuy.length} article${toBuy.length > 1 ? "s" : ""}`}>
        {groups.length ? (
          groups.map(([aisle, xs]) => (
            <div key={aisle}>
              <h3 className="aisle">{aisle}</h3>
              <div className="list">
                {xs.map((x) => (
                  <div className="row" key={x.id}>
                    <div className="grow">
                      <span className="t">{x.name}</span> {x.origin === "menu" && <span className="tag">menu</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="empty">Liste vide. Les essentiels ci-dessus et les ingrédients du menu arriveront ici.</p>
        )}
      </Slip>
    </>
  );
}
