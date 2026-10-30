import { cookieForTeam, parseTeam, TEAM_MAX, teamFromCookieHeader } from '../lib/team.js';

const STORAGE_KEY = 'pokedex-team';

export function readTeam(): string[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed: unknown = JSON.parse(stored);
			if (Array.isArray(parsed)) return parseTeam(parsed.join(','));
		}
	} catch {
		// Fall back to the cookie below.
	}
	return teamFromCookieHeader(document.cookie);
}

export function saveTeam(team: string[]): void {
	const next = parseTeam(team.join(','));
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// localStorage may be unavailable; the cookie still works.
	}
	document.cookie = cookieForTeam(next);
}

export const isOnTeam = (team: string[], name: string) => team.includes(name);

export const isTeamFull = (team: string[]) => team.length >= TEAM_MAX;

export const addToTeam = (name: string): string[] => {
	const team = readTeam();
	if (isOnTeam(team, name) || isTeamFull(team)) return team;
	const next = [...team, name];
	saveTeam(next);
	return next;
};

export const removeFromTeam = (name: string): string[] => {
	const next = readTeam().filter((member) => member !== name);
	saveTeam(next);
	return next;
};
