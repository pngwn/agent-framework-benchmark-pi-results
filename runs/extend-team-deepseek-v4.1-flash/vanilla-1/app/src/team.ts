import { h } from './dom';

export const MAX_TEAM_SIZE = 6;

// A team is stored in the browser: up to six species API names, in the order they were added.
const STORAGE_KEY = 'pokedex.team';

function normalize(names: unknown): string[] {
  if (!Array.isArray(names)) return [];
  const team: string[] = [];
  for (const name of names) {
    if (typeof name !== 'string' || !name || team.includes(name)) continue;
    team.push(name);
    if (team.length === MAX_TEAM_SIZE) break;
  }
  return team;
}

export function readTeam(): string[] {
  try {
    return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

function saveTeam(names: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    // Storage can be unavailable (for example in private mode). The app still works for this page.
  }
}

export const teamHas = (name: string): boolean => readTeam().includes(name);

export function addToTeam(name: string): string[] {
  const team = readTeam();
  if (team.includes(name) || team.length >= MAX_TEAM_SIZE) return team;
  team.push(name);
  saveTeam(team);
  return team;
}

export function removeFromTeam(name: string): string[] {
  const team = readTeam().filter((n) => n !== name);
  saveTeam(team);
  return team;
}

/** Add/remove button for a Pokémon page, kept in sync with the stored team. */
export function teamControl(name: string): HTMLElement {
  const button = h('button', { type: 'button', class: 'team-button' });
  const note = h('span', { class: 'team-button__note' });
  const control = h('div', { class: 'team-control' }, button, note);

  const update = () => {
    const team = readTeam();
    const onTeam = team.includes(name);
    const full = team.length >= MAX_TEAM_SIZE;
    button.textContent = onTeam ? 'Remove from team' : 'Add to team';
    button.disabled = !onTeam && full;
    note.textContent = !onTeam && full ? 'Team is full' : '';
  };

  button.addEventListener('click', () => {
    if (teamHas(name)) removeFromTeam(name);
    else addToTeam(name);
    update();
  });

  update();
  return control;
}
