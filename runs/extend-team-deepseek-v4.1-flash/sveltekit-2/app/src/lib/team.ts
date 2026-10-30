// The team lives in the browser. It is stored in a cookie so the server can render the
// correct state on the first request (no flash of the wrong button label) and the browser
// keeps it across reloads and navigation.

export const TEAM_COOKIE = 'team';
export const TEAM_LIMIT = 6;

export function parseTeam(value: string | null | undefined): string[] {
	if (!value) return [];
	const names = value
		.split(',')
		.map((name) => name.trim())
		.filter(Boolean);
	return [...new Set(names)].slice(0, TEAM_LIMIT);
}

export function serializeTeam(names: string[]): string {
	return names.slice(0, TEAM_LIMIT).join(',');
}
