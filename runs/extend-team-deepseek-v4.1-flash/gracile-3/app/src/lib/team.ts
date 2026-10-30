// The team lives in the browser. A cookie is used instead of localStorage so the
// server can render the correct state on the first request, with no wrong label
// flashing before the client hydrates.

export const MAX_TEAM = 6;
export const TEAM_COOKIE = 'team';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const VALID_NAME = /^[a-z0-9-]+$/;

/** Cleans a list of species names: lowercase, no blanks, no duplicates, max 6. */
export function normalizeTeam(names: readonly string[]): string[] {
	const seen = new Set<string>();
	const team: string[] = [];
	for (const value of names) {
		const name = value.trim().toLowerCase();
		if (!name || !VALID_NAME.test(name) || seen.has(name)) continue;
		seen.add(name);
		team.push(name);
		if (team.length >= MAX_TEAM) break;
	}
	return team;
}

/** Decodes a cookie value (`pikachu%2Ceevee`) into a team. */
export function parseTeamValue(value: string | null | undefined): string[] {
	if (!value) return [];
	let decoded = value;
	try {
		decoded = decodeURIComponent(value);
	} catch {
		// Keep the raw value; invalid characters are filtered out below.
	}
	return normalizeTeam(decoded.split(','));
}

/** Reads the team out of a `Cookie` request header. */
export function teamFromCookieHeader(header: string | null | undefined): string[] {
	if (!header) return [];
	for (const part of header.split(';')) {
		const [key, ...rest] = part.trim().split('=');
		if (key === TEAM_COOKIE) return parseTeamValue(rest.join('='));
	}
	return [];
}

/** Encodes a team as a cookie value. */
export function serializeTeam(names: readonly string[]): string {
	return encodeURIComponent(normalizeTeam(names).join(','));
}

/** Reads the team from `document.cookie` (browser only). */
export function readTeamCookie(): string[] {
	if (typeof document === 'undefined') return [];
	for (const part of document.cookie.split(';')) {
		const [key, ...rest] = part.trim().split('=');
		if (key === TEAM_COOKIE) return parseTeamValue(rest.join('='));
	}
	return [];
}

/** Writes the team to `document.cookie` (browser only). */
export function writeTeamCookie(names: readonly string[]): void {
	if (typeof document === 'undefined') return;
	const value = serializeTeam(names);
	document.cookie = `${TEAM_COOKIE}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}
