import {
	addToTeam,
	isOnTeam,
	isTeamFull,
	readTeam,
	removeFromTeam,
} from './team-store.js';

/** The add/remove control near the top of a Pokémon page. */
class TeamToggle extends HTMLElement {
	#name = '';

	connectedCallback() {
		this.#name = this.dataset['name'] ?? '';
		const button = this.querySelector('button');
		if (!button || !this.#name) return;

		// The server renders the initial state from the cookie. Sync from the
		// browser store on upgrade in case it is newer.
		this.#render(readTeam());
		button.addEventListener('click', () => {
			const team = isOnTeam(readTeam(), this.#name)
				? removeFromTeam(this.#name)
				: addToTeam(this.#name);
			this.#render(team);
		});
	}

	#render(team: string[]) {
		const button = this.querySelector('button');
		if (!button) return;

		const onTeam = isOnTeam(team, this.#name);
		const full = isTeamFull(team) && !onTeam;
		button.textContent = onTeam ? 'Remove from team' : 'Add to team';
		button.disabled = full;

		const note = this.querySelector('[data-team-full]');
		if (!full) {
			note?.remove();
		} else if (!note) {
			const span = document.createElement('span');
			span.className = 'team-toggle__note';
			span.dataset['teamFull'] = '';
			span.textContent = 'Team is full';
			this.append(span);
		}
	}
}

customElements.define('team-toggle', TeamToggle);
