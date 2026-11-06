import type { ComponentType, SVGProps } from "react";
import { IconAgenda, IconHome, IconMeals, IconShop, IconToday } from "./icons";
import type { MagnetColor } from "./Slip";

export type TabId = "today" | "home" | "meals" | "shopping" | "agenda";

export const TABS: { id: TabId; label: string; color: MagnetColor; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: "today", label: "Aujourd'hui", color: "blue", Icon: IconToday },
  { id: "home", label: "Maison", color: "green", Icon: IconHome },
  { id: "meals", label: "Repas", color: "red", Icon: IconMeals },
  { id: "shopping", label: "Courses", color: "yellow", Icon: IconShop },
  { id: "agenda", label: "Agenda", color: "violet", Icon: IconAgenda },
];

export function isTabId(v: unknown): v is TabId {
  return TABS.some((t) => t.id === v);
}

interface TabBarProps {
  current: TabId;
  onChange: (tab: TabId) => void;
  badges: Partial<Record<TabId, { count: number; label: string }>>;
}

export function TabBar({ current, onChange, badges }: TabBarProps) {
  return (
    <nav className="tabs" aria-label="Sections">
      <ul>
        {TABS.map(({ id, label, color, Icon }) => {
          const badge = badges[id];
          return (
            <li key={id}>
              <button
                type="button"
                className={`c-${color}`}
                aria-current={current === id ? "page" : undefined}
                onClick={() => onChange(id)}
              >
                <Icon />
                {badge && badge.count > 0 && (
                  <span className="badge" aria-hidden="true">
                    {badge.count > 99 ? "99+" : badge.count}
                  </span>
                )}
                <span>{label}</span>
                {badge && badge.count > 0 && <span className="sr-only">, {badge.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
