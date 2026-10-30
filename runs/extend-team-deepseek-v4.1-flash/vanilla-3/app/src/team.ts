/** The team belongs to the browser, so it is kept in localStorage as a list of species names. */
const STORAGE_KEY = 'pokedex.team';

export const TEAM_SIZE = 6;

/** The species on the team, in the order they were added. */
export function getTeam(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const team: string[] = [];
    for (const name of value) {
      if (typeof name !== 'string' || !name || seen.has(name)) continue;
      seen.add(name);
      team.push(name);
      if (team.length === TEAM_SIZE) break;
    }
    return team;
  } catch {
    return [];
  }
}

function saveTeam(team: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(team.slice(0, TEAM_SIZE)));
  } catch {
    // Storage can be unavailable (for example in privacy modes); the page still works.
  }
}

export const isOnTeam = (name: string): boolean => getTeam().includes(name);

/** Adds a species to the end of the team. Returns false if it is already there or the team is full. */
export function addToTeam(name: string): boolean {
  const team = getTeam();
  if (team.includes(name) || team.length >= TEAM_SIZE) return false;
  saveTeam([...team, name]);
  return true;
}

export function removeFromTeam(name: string): void {
  const team = getTeam();
  if (!team.includes(name)) return;
  saveTeam(team.filter((n) => n !== name));
}
