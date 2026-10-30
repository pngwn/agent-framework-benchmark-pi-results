import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { MAX_TEAM_SIZE, normalizeTeam, writeTeamCookie } from "../lib/team";

type TeamContextValue = {
  team: string[];
  isFull: boolean;
  has: (name: string) => boolean;
  add: (name: string) => void;
  remove: (name: string) => void;
};

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ initialTeam, children }: { initialTeam: string[]; children: React.ReactNode }) {
  const [team, setTeam] = useState(() => [...initialTeam]);
  const latest = useRef(team);

  const commit = useCallback((next: string[]) => {
    const normalized = normalizeTeam(next);
    latest.current = normalized;
    setTeam(normalized);
    writeTeamCookie(normalized);
  }, []);

  const add = useCallback(
    (name: string) => {
      if (latest.current.includes(name) || latest.current.length >= MAX_TEAM_SIZE) return;
      commit([...latest.current, name]);
    },
    [commit],
  );

  const remove = useCallback(
    (name: string) => {
      if (!latest.current.includes(name)) return;
      commit(latest.current.filter((member) => member !== name));
    },
    [commit],
  );

  const value = useMemo<TeamContextValue>(
    () => ({
      team,
      isFull: team.length >= MAX_TEAM_SIZE,
      has: (name) => team.includes(name),
      add,
      remove,
    }),
    [team, add, remove],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam(): TeamContextValue {
  const value = useContext(TeamContext);
  if (!value) throw new Error("useTeam must be used inside a TeamProvider");
  return value;
}

