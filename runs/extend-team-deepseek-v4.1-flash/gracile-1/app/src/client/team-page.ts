import { fetchFragment, isAbort } from './fragments.js';
import { readTeam, writeTeam } from './team-store.js';

/** Team page: removes a member and refreshes the server-rendered summary. */
class TeamPage extends HTMLElement {
	connectedCallback() {
		this.addEventListener('click', (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const button = target.closest('button[data-team-remove]');
			if (!(button instanceof HTMLButtonElement) || !this.contains(button)) return;

			const name = button.dataset['teamRemove'];
			if (!name) return;
			writeTeam(readTeam().filter((member) => member !== name));
			this.#refresh();
		});
	}

	async #refresh() {
		try {
			const fresh = await fetchFragment('/team', 'team-page');
			if (fresh) this.replaceWith(document.importNode(fresh, true));
		} catch (error) {
			if (!isAbort(error)) location.assign('/team');
		}
	}
}

customElements.define('team-page', TeamPage);
