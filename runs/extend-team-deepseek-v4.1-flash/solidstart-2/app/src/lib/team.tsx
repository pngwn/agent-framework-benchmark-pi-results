import { createContext, createSignal, useContext, type Accessor, type JSX } from "solid-js";
import { parseTeamCookie, teamCookie, TEAM_COOKIE, MAX_TEAM } from "./team-store";

type TeamContextValue = {
  names: Accessor<string[]>;
  has: (name: string) => boolean;
  add: (name: string) => void;
  remove: (name: string) => void;
  full: Accessor<boolean>;
};

const TeamContext = createContext<TeamContextValue>();

function browserTeam(): string[] {
  if (typeof document === "undefined") return [];
  const raw = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${TEAM_COOKIE}=`));
  return parseTeamCookie(raw?.slice(TEAM_COOKIE.length + 1));
}

export function TeamProvider(props: { initial?: string[]; children: JSX.Element }) {
  // The server passes the cookie-backed team. On a plain client mount, fall back to
  // reading the same cookie so hydration starts from identical state.
  const [names, setNames] = createSignal(props.initial ?? browserTeam());

  const persist = (next: string[]) => {
    setNames(next);
    if (typeof document !== "undefined") document.cookie = teamCookie(next);
  };

  const add = (name: string) => {
    const value = name.toLowerCase();
    if (!value || names().includes(value) || names().length >= MAX_TEAM) return;
    persist([...names(), value]);
  };

  const remove = (name: string) => {
    const value = name.toLowerCase();
    if (!names().includes(value)) return;
    persist(names().filter((n) => n !== value));
  };

  const value: TeamContextValue = {
    names,
    has: (name) => names().includes(name.toLowerCase()),
    add,
    remove,
    full: () => names().length >= MAX_TEAM,
  };

  return <TeamContext.Provider value={value}>{props.children}</TeamContext.Provider>;
}

export function useTeam(): TeamContextValue {
  const team = useContext(TeamContext);
  if (!team) throw new Error("useTeam must be used inside a TeamProvider");
  return team;
}
