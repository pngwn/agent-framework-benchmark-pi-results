import { getContext, setContext } from 'svelte';
import { parseTeam, serializeTeam, TEAM_COOKIE, TEAM_LIMIT } from './team.ts';

const TEAM_KEY = Symbol('team');

export class TeamState {
	names = $state<string[]>([]);

	constructor(names: string[] = []) {
		this.names = parseTeam(names.join(','));
	}

	get count(): number {
		return this.names.length;
	}

	get full(): boolean {
		return this.names.length >= TEAM_LIMIT;
	}

	has(name: string): boolean {
		return this.names.includes(name);
	}

	add(name: string): void {
		if (this.full || this.has(name)) return;
		this.names = [...this.names, name];
		this.persist();
	}

	remove(name: string): void {
		if (!this.has(name)) return;
		this.names = this.names.filter((n) => n !== name);
		this.persist();
	}

	private persist(): void {
		if (typeof document === 'undefined') return;
		const value = encodeURIComponent(serializeTeam(this.names));
		document.cookie = `${TEAM_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
	}
}

export function setTeam(team: TeamState): void {
	setContext(TEAM_KEY, team);
}

export function getTeam(): TeamState {
	return getContext<TeamState>(TEAM_KEY);
}
