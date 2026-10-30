// The team lives in a cookie owned by the browser, so both the server (for the initial
// render) and the client (when a Pokémon is added or removed) can read the same list.

export const TEAM_SIZE = 6;
export const TEAM_COOKIE = 'team';
export const TEAM_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Parses a team cookie value into an ordered, duplicate-free list of species names. */
export function parseTeam(value: string | null | undefined): string[] {
	if (!value) return [];

	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		try {
			parsed = JSON.parse(decodeURIComponent(value));
		} catch {
			return [];
		}
	}

	if (!Array.isArray(parsed)) return [];
	const names = parsed.filter((name): name is string => typeof name === 'string' && name.length > 0);
	return [...new Set(names.map((name) => name.toLowerCase()))].slice(0, TEAM_SIZE);
}

/** Serializes the team for storage in a cookie. */
export function serializeTeam(names: string[]): string {
	return encodeURIComponent(JSON.stringify(names.slice(0, TEAM_SIZE)));
}

/** Writes the team to the browser's cookie jar. Call only from the browser. */
export function saveTeam(names: string[]): void {
	document.cookie = `${TEAM_COOKIE}=${serializeTeam(names)}; Path=/; Max-Age=${TEAM_COOKIE_MAX_AGE}; SameSite=Lax`;
}
