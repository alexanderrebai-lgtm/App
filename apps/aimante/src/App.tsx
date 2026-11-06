import { useEffect, useState } from "react";
import { overdueCount } from "./domain/chores";
import { db } from "./data/db";
import { useLive } from "./data/live";
import { pruneOldData } from "./data/prune";
import { choresRepo, shoppingRepo } from "./data/repositories";
import { ensureSeeded } from "./data/seed";
import { today } from "./domain/dates";
import { AgendaScreen } from "./features/agenda/AgendaScreen";
import { HomeScreen } from "./features/home/HomeScreen";
import { MealsScreen } from "./features/meals/MealsScreen";
import { SettingsSheet } from "./features/settings/SettingsSheet";
import { ShoppingScreen } from "./features/shopping/ShoppingScreen";
import { TodayScreen } from "./features/today/TodayScreen";
import { isTabId, TabBar, type TabId } from "./ui/TabBar";
import { useToday } from "./ui/useToday";

const TAB_KEY = "aimante:tab";

function readTab(): TabId {
  try {
    const v = localStorage.getItem(TAB_KEY);
    return isTabId(v) ? v : "today";
  } catch {
    return "today";
  }
}

function useBootstrap() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const t = today();
    ensureSeeded(db, t)
      .then(() => pruneOldData(db, t))
      .then(() => setState("ready"))
      .catch((e: unknown) => {
        console.error(e);
        setState("error");
      });
    // Demande au navigateur de ne pas effacer les données en cas de manque de place.
    navigator.storage?.persist?.().catch(() => {});
  }, []);
  return state;
}

export function App() {
  const boot = useBootstrap();
  const [tab, setTab] = useState<TabId>(readTab);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const t = useToday();
  const chores = useLive(choresRepo.getAll);
  const shopping = useLive(shoppingRepo.getAll);
  const late = chores ? overdueCount(chores, t) : 0;
  const toBuy = shopping ? shopping.filter((i) => !i.checked).length : 0;

  const goTo = (next: TabId) => {
    setTab(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {
      // Stockage indisponible (navigation privée) : l'onglet ne sera pas mémorisé.
    }
    window.scrollTo(0, 0);
  };

  if (boot === "error") {
    return (
      <main className="wrap">
        <h1>Oups.</h1>
        <p>
          Aimanté n'arrive pas à ouvrir son espace de stockage. En navigation privée, certains navigateurs le bloquent :
          ouvre l'appli dans une fenêtre normale.
        </p>
      </main>
    );
  }
  if (boot === "loading") return <div className="splash" aria-busy="true" />;

  return (
    <>
      <main className="wrap" key={tab}>
        {tab === "today" && <TodayScreen onOpenSettings={() => setSettingsOpen(true)} goTo={goTo} />}
        {tab === "home" && <HomeScreen />}
        {tab === "meals" && <MealsScreen />}
        {tab === "shopping" && <ShoppingScreen />}
        {tab === "agenda" && <AgendaScreen />}
      </main>
      <TabBar
        current={tab}
        onChange={goTo}
        badges={{
          home: { count: late, label: `${late} tâche${late > 1 ? "s" : ""} en retard` },
          shopping: { count: toBuy, label: `${toBuy} article${toBuy > 1 ? "s" : ""} à acheter` },
        }}
      />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
