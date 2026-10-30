// Team membership lives in the browser. These helpers are shared by the server
// (which reads the cookie to render the first paint) and the client.

export const TEAM_MAX = 6;
export const TEAM_COOKIE = 'pokedex-team';

const VALID_NAME = /^[a-z0-9-]+$/i;

/** Normalizes a comma-separated team value: valid names, no duplicates, max 6. */
export function parseTeam(raw: string | null | undefined): string[] {
	if (!raw) return [];
	let text = raw;
	try {
		text = decodeURIComponent(raw);
	} catch {
		// Keep the raw value if it isn't valid percent-encoding.
	}
	return text
		.split(',')
		.map((name) => name.trim().toLowerCase())
		.filter((name, index, all) => VALID_NAME.test(name) && all.indexOf(name) === index)
		.slice(0, TEAM_MAX);
}

export const serializeTeam = (team: string[]) => encodeURIComponent(team.join(','));

/** Reads the team from a `Cookie` request header (or `document.cookie`). */
export function teamFromCookieHeader(cookie: string | null | undefined): string[] {
	if (!cookie) return [];
	for (const part of cookie.split(';')) {
		const separator = part.indexOf('=');
		if (separator === -1) continue;
		if (part.slice(0, separator).trim() !== TEAM_COOKIE) continue;
		return parseTeam(part.slice(separator + 1).trim());
	}
	return [];
}

export const cookieForTeam = (team: string[]) =>
	`${TEAM_COOKIE}=${serializeTeam(team)}; Path=/; Max-Age=31536000; SameSite=Lax`;
