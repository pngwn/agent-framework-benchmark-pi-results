import {
	parseTeamCookie,
	sanitizeTeam,
	serializeTeamCookie,
	TEAM_SIZE,
} from '../lib/team.js';

export { TEAM_SIZE };

export const readTeam = () => parseTeamCookie(document.cookie);

export function writeTeam(team: string[]) {
	document.cookie = serializeTeamCookie(sanitizeTeam(team));
}

export function toggleTeamMember(name: string) {
	const team = readTeam();
	if (team.includes(name)) return team.filter((member) => member !== name);
	if (team.length >= TEAM_SIZE) return team;
	return [...team, name];
}
