import { fetchFragment, isAbort } from './fragments.js';
import {
	MAX_TEAM,
	readTeamCookie,
	writeTeamCookie,
} from '../lib/team.js';

/** The add/remove button on a Pokémon page. */
class TeamToggle extends HTMLElement {
	connectedCallback() {
		const button = this.querySelector('button');
		button?.addEventListener('click', () => this.#toggle());
	}

	#toggle() {
		const species = this.dataset['species'];
		if (!species) return;

		const current = readTeamCookie();
		const inTeam = current.includes(species);
		const team = inTeam
			? current.filter((name) => name !== species)
			: [...current, species].slice(0, MAX_TEAM);

		writeTeamCookie(team);
		this.#render(team.includes(species), team.length >= MAX_TEAM);
	}

	#render(inTeam: boolean, full: boolean) {
		const button = this.querySelector('button');
		if (!button) return;
		button.textContent = inTeam ? 'Remove from team' : 'Add to team';
		button.disabled = !inTeam && full;
		this.dataset['inTeam'] = String(inTeam);

		const existing = this.querySelector('.team-toggle__status');
		if (!inTeam && full) {
			const status = existing ?? document.createElement('span');
			status.className = 'team-toggle__status';
			status.textContent = 'Team is full';
			if (!existing) this.append(status);
		} else {
			existing?.remove();
		}
	}
}

/** The remove buttons and live refresh on the team page. */
class TeamPage extends HTMLElement {
	connectedCallback() {
		this.addEventListener('click', (event) => {
			const button = (event.target as Element).closest('button[data-team-remove]');
			if (!(button instanceof HTMLButtonElement) || !this.contains(button)) return;
			const species = button.dataset['teamRemove'];
			if (!species) return;

			writeTeamCookie(readTeamCookie().filter((name) => name !== species));
			this.#refresh();
		});
	}

	async #refresh() {
		try {
			const fresh = await fetchFragment('/team', '#team-content');
			const current = this.querySelector('#team-content');
			if (fresh && current) current.replaceWith(document.importNode(fresh, true));
		} catch (error) {
			if (!isAbort(error)) location.assign('/team');
		}
	}
}

customElements.define('team-toggle', TeamToggle);
customElements.define('team-page', TeamPage);
