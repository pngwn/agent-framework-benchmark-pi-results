import { removeFromTeam } from './team-store.js';

/** Remove buttons on the team page. */
class TeamList extends HTMLElement {
	connectedCallback() {
		this.addEventListener('click', (event) => {
			const button = (event.target as Element).closest('button[data-remove-member]');
			if (!(button instanceof HTMLButtonElement) || !this.contains(button)) return;
			const name = button.dataset['removeMember'];
			if (!name) return;
			removeFromTeam(name);
			location.reload();
		});
	}
}

customElements.define('team-list', TeamList);
