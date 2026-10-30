/**
 * The user's team: up to six species names in the order they were added, without
 * duplicates. It lives in localStorage so it survives reloads and navigation.
 */

const STORAGE_KEY = 'pokedex.team';
export const TEAM_SIZE = 6;

type Listener = (team: readonly string[]) => void;

let cached: string[] | null = null;
const listeners = new Set<Listener>();

function sanitize(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item || names.includes(item)) continue;
    names.push(item);
    if (names.length === TEAM_SIZE) break;
  }
  return names;
}

function read(): string[] {
  if (cached) return cached;
  try {
    cached = sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    cached = [];
  }
  return cached;
}

function emit(): void {
  const team = read();
  for (const listener of listeners) listener(team);
}

function write(team: string[]): void {
  cached = team;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
  } catch {
    // Storage may be unavailable (private mode); the team then lasts for this page only.
  }
  emit();
}

export const getTeam = (): readonly string[] => read();

export const isOnTeam = (name: string): boolean => read().includes(name);

export const isTeamFull = (): boolean => read().length >= TEAM_SIZE;

/** Adds a species to the end of the team. Returns false when it is already there or the team is full. */
export function addToTeam(name: string): boolean {
  const team = read();
  if (team.includes(name) || team.length >= TEAM_SIZE) return false;
  write([...team, name]);
  return true;
}

export function removeFromTeam(name: string): void {
  const team = read();
  if (!team.includes(name)) return;
  write(team.filter((n) => n !== name));
}

export function subscribeToTeam(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Keep other tabs/windows in sync with the same browser storage.
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  cached = null;
  emit();
});
