import { readTeam, TEAM_SIZE, writeTeam } from './team-store.js';

/**
 * Button on a Pokémon page that adds or removes that species from the team.
 * The server renders the correct state from the cookie, and this element keeps
 * it in sync after activation without reloading the page.
 */
class TeamToggle extends HTMLElement {
	#button: HTMLButtonElement | null = null;
	#note: HTMLElement | null = null;

	connectedCallback() {
		this.#button = this.querySelector('button');
		this.#note = this.querySelector('.team-toggle__note');
		this.#button?.addEventListener('click', () => this.#toggle());
		this.#render();
	}

	#toggle() {
		const name = this.dataset['species'];
		if (!name || !this.#button) return;
		const team = readTeam();
		if (team.includes(name)) {
			writeTeam(team.filter((member) => member !== name));
		} else {
			if (team.length >= TEAM_SIZE) return;
			writeTeam([...team, name]);
		}
		this.#render();
	}

	#render() {
		const name = this.dataset['species'];
		const team = readTeam();
		const onTeam = Boolean(name && team.includes(name));
		const full = team.length >= TEAM_SIZE;

		if (this.#button) {
			this.#button.textContent = onTeam ? 'Remove from team' : 'Add to team';
			this.#button.disabled = !onTeam && full;
		}
		if (this.#note) {
			this.#note.textContent = !onTeam && full ? 'Team is full' : '';
		}
	}
}

customElements.define('team-toggle', TeamToggle);
