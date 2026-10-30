import { createContext, createSignal, useContext, type JSX } from "solid-js";
import { readRequestTeam, TEAM_LIMIT, writeTeamCookie } from "./team";

type TeamStore = {
  team: () => string[];
  has: (name: string) => boolean;
  full: () => boolean;
  add: (name: string) => void;
  remove: (name: string) => void;
};

const TeamContext = createContext<TeamStore>();

export function TeamProvider(props: { children: JSX.Element }) {
  // The cookie is available on the server as well as in the browser, so the first render
  // already has the right team and the add/remove button never flashes the wrong label.
  const [team, setTeam] = createSignal<string[]>(readRequestTeam());

  const commit = (next: string[]) => {
    setTeam(next);
    writeTeamCookie(next);
  };

  const store: TeamStore = {
    team,
    has: (name) => team().includes(name),
    full: () => team().length >= TEAM_LIMIT,
    add: (name) => {
      const current = team();
      if (!name || current.includes(name) || current.length >= TEAM_LIMIT) return;
      commit([...current, name]);
    },
    remove: (name) => {
      const current = team();
      if (!current.includes(name)) return;
      commit(current.filter((entry) => entry !== name));
    },
  };

  return <TeamContext.Provider value={store}>{props.children}</TeamContext.Provider>;
}

export function useTeam(): TeamStore {
  const store = useContext(TeamContext);
  if (!store) throw new Error("useTeam must be used inside TeamProvider");
  return store;
}
