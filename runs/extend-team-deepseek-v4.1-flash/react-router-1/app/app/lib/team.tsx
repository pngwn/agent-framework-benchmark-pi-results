import { createContext, useContext, useState, type ReactNode } from "react";
import type { Card } from "./types";

export const TEAM_SIZE = 6;
export const TEAM_COOKIE = "team";

/** Team species names, without duplicates, in the order they were added. */
export function normalizeTeam(names: readonly string[]): string[] {
  const team: string[] = [];
  for (const name of names) {
    if (typeof name !== "string" || !name || team.includes(name)) continue;
    if (team.length === TEAM_SIZE) break;
    team.push(name);
  }
  return team;
}

/** Reads the team from a Cookie request header. */
export function parseTeamCookie(header: string | null): string[] {
  if (!header) return [];
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key !== TEAM_COOKIE) continue;
    try {
      const value = JSON.parse(decodeURIComponent(rest.join("=")));
      if (Array.isArray(value)) return normalizeTeam(value);
    } catch {
      return [];
    }
  }
  return [];
}

/** The document.cookie value that stores the given team. */
export function teamCookie(team: readonly string[]): string {
  return `${TEAM_COOKIE}=${encodeURIComponent(JSON.stringify(team))}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

type TeamContextValue = {
  team: string[];
  has: (name: string) => boolean;
  add: (name: string) => void;
  remove: (name: string) => void;
  isFull: boolean;
};

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ initialTeam, children }: { initialTeam: string[]; children: ReactNode }) {
  const [team, setTeam] = useState(() => normalizeTeam(initialTeam));

  const commit = (next: string[]) => {
    setTeam(next);
    if (typeof document !== "undefined") document.cookie = teamCookie(next);
  };

  const add = (name: string) => {
    const normalized = name.toLowerCase();
    if (team.includes(normalized) || team.length >= TEAM_SIZE) return;
    commit([...team, normalized]);
  };

  const remove = (name: string) => {
    const normalized = name.toLowerCase();
    if (!team.includes(normalized)) return;
    commit(team.filter((member) => member !== normalized));
  };

  return (
    <TeamContext.Provider
      value={{ team, has: (name) => team.includes(name.toLowerCase()), add, remove, isFull: team.length >= TEAM_SIZE }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam(): TeamContextValue {
  const value = useContext(TeamContext);
  if (!value) throw new Error("useTeam must be used inside a TeamProvider");
  return value;
}

export type CoverageRelation = {
  name: string;
  label: string;
  doubleDamageTo: string[];
  halfDamageTo: string[];
  noDamageTo: string[];
};

export type CoverageRow = { name: string; label: string; weak: number; resistant: number };

/** Counts, for each attacking type, how many team members are weak to or resist it. */
export function computeCoverage(members: Card[], relations: CoverageRelation[]): CoverageRow[] {
  return relations.map((relation) => {
    let weak = 0;
    let resistant = 0;
    for (const member of members) {
      let multiplier = 1;
      for (const type of member.types ?? []) {
        if (relation.doubleDamageTo.includes(type.name)) multiplier *= 2;
        else if (relation.halfDamageTo.includes(type.name)) multiplier *= 0.5;
        else if (relation.noDamageTo.includes(type.name)) multiplier *= 0;
      }
      if (multiplier > 1) weak++;
      else if (multiplier < 1) resistant++;
    }
    return { name: relation.name, label: relation.label, weak, resistant };
  });
}
