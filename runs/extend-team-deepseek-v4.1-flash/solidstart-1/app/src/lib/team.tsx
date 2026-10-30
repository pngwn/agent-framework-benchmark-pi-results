import { createContext, createSignal, useContext, type JSX } from "solid-js";
import { getRequestEvent, isServer } from "solid-js/web";

export const TEAM_SIZE = 6;
const TEAM_COOKIE = "team";

const validName = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z0-9][a-z0-9-]*$/.test(value);

const normalize = (names: unknown[]): string[] => {
  const seen = new Set<string>();
  const team: string[] = [];
  for (const name of names) {
    if (!validName(name) || seen.has(name)) continue;
    seen.add(name);
    team.push(name);
    if (team.length === TEAM_SIZE) break;
  }
  return team;
};

function cookieHeader(): string {
  if (isServer) {
    const event = getRequestEvent() as any;
    return event?.request?.headers?.get?.("cookie") ?? event?.nativeEvent?.req?.headers?.get?.("cookie") ?? "";
  }
  return typeof document === "undefined" ? "" : document.cookie;
}

function readCookie(name: string): string | undefined {
  for (const part of cookieHeader().split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      return undefined;
    }
  }
}

export function readTeam(): string[] {
  const raw = readCookie(TEAM_COOKIE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalize(parsed) : [];
  } catch {
    return [];
  }
}

function writeTeam(team: string[]) {
  if (isServer) return;
  const value = encodeURIComponent(JSON.stringify(team));
  document.cookie = `${TEAM_COOKIE}=${value}; path=/; max-age=31536000; SameSite=Lax`;
}

type TeamContextValue = {
  members: () => string[];
  isOnTeam: (name: string) => boolean;
  isFull: () => boolean;
  add: (name: string) => void;
  remove: (name: string) => void;
};

const TeamContext = createContext<TeamContextValue>();

export function TeamProvider(props: { children: JSX.Element }) {
  const [members, setMembers] = createSignal<string[]>(readTeam());

  const update = (next: string[]) => {
    setMembers(next);
    writeTeam(next);
  };

  const value: TeamContextValue = {
    members,
    isOnTeam: (name) => members().includes(name),
    isFull: () => members().length >= TEAM_SIZE,
    add: (name) => {
      if (!validName(name) || members().includes(name) || members().length >= TEAM_SIZE) return;
      update(normalize([...members(), name]));
    },
    remove: (name) => {
      if (!members().includes(name)) return;
      update(members().filter((member) => member !== name));
    },
  };

  return <TeamContext.Provider value={value}>{props.children}</TeamContext.Provider>;
}

export function useTeam(): TeamContextValue {
  const context = useContext(TeamContext);
  if (!context) throw new Error("useTeam must be used inside TeamProvider");
  return context;
}
