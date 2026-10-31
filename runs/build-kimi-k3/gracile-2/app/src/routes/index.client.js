// Progressive enhancement for the Pokémon list: typing in the search box or
// changing a select updates the URL and swaps in the filtered results
// without a full page load. Without JS, the form still works via GET.

const form = document.getElementById('filters');

if (form) {
	const q = form.elements.q;
	const type = form.elements.type;
	const generation = form.elements.generation;

	let timer = null;
	let requestId = 0;

	function currentUrl() {
		const params = new URLSearchParams();
		if (q.value.trim()) params.set('q', q.value.trim());
		if (type.value) params.set('type', type.value);
		if (generation.value) params.set('generation', generation.value);
		const query = params.toString();
		return query ? `/?${query}` : '/';
	}

	async function refresh(url) {
		const id = ++requestId;
		try {
			const res = await fetch(url);
			const text = await res.text();
			if (id !== requestId) return;
			const doc = new DOMParser().parseFromString(text, 'text/html');
			const next = doc.getElementById('results');
			const current = document.getElementById('results');
			if (next && current) current.replaceWith(next);
		} catch {
			// Network hiccup: fall back to a full navigation.
			window.location.href = url;
		}
	}

	function apply() {
		const url = currentUrl();
		window.history.pushState(null, '', url);
		refresh(url);
	}

	q.addEventListener('input', () => {
		clearTimeout(timer);
		timer = setTimeout(apply, 150);
	});
	type.addEventListener('change', apply);
	generation.addEventListener('change', apply);
	form.addEventListener('submit', (event) => {
		event.preventDefault();
		apply();
	});

	window.addEventListener('popstate', () => {
		const params = new URLSearchParams(window.location.search);
		q.value = params.get('q') ?? '';
		type.value = params.get('type') ?? '';
		generation.value = params.get('generation') ?? '';
		refresh(window.location.href);
	});
}
