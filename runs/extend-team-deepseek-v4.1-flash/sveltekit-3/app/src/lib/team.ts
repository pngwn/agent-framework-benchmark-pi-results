// The team is browser-owned state. It is stored in a cookie rather than localStorage so
// the server can render the right label on the first response (no flash of the wrong
// button after hydration), and it is small enough that the cookie size is a non-issue.

export const TEAM_COOKIE = 'team';
export const MAX_TEAM_SIZE = 6;
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Turns a cookie value into a usable team: string names, no empty values or duplicates. */
export function parseTeamCookie(value: string | undefined | null): string[] {
	if (!value) return [];

	const candidates = [value];
	try {
		candidates.push(decodeURIComponent(value));
	} catch {
		// Not percent-encoded; the raw value is still worth trying.
	}

	for (const candidate of candidates) {
		try {
			const parsed: unknown = JSON.parse(candidate);
			if (!Array.isArray(parsed)) continue;
			const names = parsed
				.filter((name): name is string => typeof name === 'string')
				.map((name) => name.trim().toLowerCase())
				.filter(Boolean);
			return [...new Set(names)].slice(0, MAX_TEAM_SIZE);
		} catch {
			// Try the next representation.
		}
	}

	// Also tolerate the older/simpler comma-separated form.
	return [
		...new Set(
			value
				.split(',')
				.map((name) => name.trim().toLowerCase())
				.filter(Boolean)
		)
	].slice(0, MAX_TEAM_SIZE);
}

/** Persists the team in the browser. The cookie is readable by the SSR load functions. */
export function writeTeamCookie(team: string[]): void {
	document.cookie = `${TEAM_COOKIE}=${encodeURIComponent(JSON.stringify(team.slice(0, MAX_TEAM_SIZE)))}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

export function addTeamMember(team: string[], name: string): string[] {
	const next = [...team];
	if (!next.includes(name) && next.length < MAX_TEAM_SIZE) next.push(name);
	writeTeamCookie(next);
	return next;
}

export function removeTeamMember(team: string[], name: string): string[] {
	const next = team.filter((member) => member !== name);
	writeTeamCookie(next);
	return next;
}
