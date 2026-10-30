export const MAX_TEAM_SIZE = 6;

/**
 * The team belongs to the browser and is persisted in a cookie so that the
 * server renders the correct state on first load (no flash after hydration).
 */
export function useTeam() {
  const team = useCookie<string[]>('pokedex-team', {
    default: () => [],
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  const members = computed(() => (Array.isArray(team.value) ? team.value : []));
  const size = computed(() => members.value.length);
  const isFull = computed(() => size.value >= MAX_TEAM_SIZE);

  const has = (name: string) => members.value.includes(name);

  function add(name: string) {
    if (has(name) || isFull.value) return;
    team.value = [...members.value, name];
  }

  function remove(name: string) {
    team.value = members.value.filter((member) => member !== name);
  }

  function toggle(name: string) {
    if (has(name)) remove(name);
    else add(name);
  }

  return { members, size, isFull, has, add, remove, toggle };
}
