export const MAX_TEAM_SIZE = 6;

const TEAM_COOKIE = 'team';

function normalizeTeam(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const team: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item || seen.has(item)) continue;
    seen.add(item);
    team.push(item);
    if (team.length === MAX_TEAM_SIZE) break;
  }
  return team;
}

/**
 * The user's team of species names, ordered by when they were added and shared
 * between pages through a cookie so it is available during server rendering too.
 */
export function useTeam() {
  const cookie = useCookie<string[]>(TEAM_COOKIE, {
    default: () => [],
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  const team = useState<string[]>('team', () => normalizeTeam(cookie.value));

  function save(next: string[]) {
    team.value = next;
    cookie.value = next;
  }

  const has = (name: string) => team.value.includes(name);
  const isFull = computed(() => team.value.length >= MAX_TEAM_SIZE);

  function add(name: string) {
    if (has(name) || isFull.value) return;
    save(normalizeTeam([...team.value, name]));
  }

  function remove(name: string) {
    if (!has(name)) return;
    save(team.value.filter((n) => n !== name));
  }

  return { team, has, isFull, add, remove };
}
