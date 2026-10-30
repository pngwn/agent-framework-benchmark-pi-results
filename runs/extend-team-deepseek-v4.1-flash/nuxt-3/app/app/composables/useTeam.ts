export const MAX_TEAM_SIZE = 6;

/**
 * The team lives in a cookie so the server can render the correct state on the
 * first request (no wrong label flashing after hydration). The cookie is only
 * a list of species names; the Pokémon data itself is always fetched live.
 */
export function useTeam() {
  const team = useCookie<string[]>('team', {
    default: () => [],
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  });

  const names = computed(() => (Array.isArray(team.value) ? team.value.filter(Boolean) : []));
  const isFull = computed(() => names.value.length >= MAX_TEAM_SIZE);
  const has = (name: string) => names.value.includes(name);

  function add(name: string) {
    if (!name || has(name) || isFull.value) return;
    team.value = [...names.value, name];
  }

  function remove(name: string) {
    team.value = names.value.filter((n) => n !== name);
  }

  return { team, names, isFull, has, add, remove };
}
