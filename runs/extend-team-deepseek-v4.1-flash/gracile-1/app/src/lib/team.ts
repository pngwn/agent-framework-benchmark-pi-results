// The team lives in a cookie so the server can render the correct team state
// on the first paint; the browser updates the same cookie without a round trip.

export const TEAM_COOKIE = 'team';
export const TEAM_SIZE = 6;

const NAME_PATTERN = /^[a-z0-9-]+$/;

/** Normalizes a team: valid species names, no duplicates, at most six. */
export function sanitizeTeam(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const team: string[] = [];
	for (const entry of value) {
		if (typeof entry !== 'string') continue;
		const name = entry.toLowerCase();
		if (!NAME_PATTERN.test(name) || team.includes(name)) continue;
		team.push(name);
		if (team.length === TEAM_SIZE) break;
	}
	return team;
}

/** Reads the team from a request's `Cookie` header. */
export function parseTeamCookie(header: string | null | undefined): string[] {
	if (!header) return [];
	const cookie = header
		.split(/;\s*/)
		.find((part) => part.startsWith(`${TEAM_COOKIE}=`));
	if (!cookie) return [];
	const raw = cookie.slice(TEAM_COOKIE.length + 1);
	try {
		return sanitizeTeam(JSON.parse(decodeURIComponent(raw)));
	} catch {
		return [];
	}
}

/** Serializes a team into a `Set-Cookie`-plausible `document.cookie` value. */
export const serializeTeamCookie = (team: string[]) =>
	`${TEAM_COOKIE}=${encodeURIComponent(JSON.stringify(sanitizeTeam(team)))}; Path=/; Max-Age=31536000; SameSite=Lax`;
