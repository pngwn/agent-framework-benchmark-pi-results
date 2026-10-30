export function humanize(name) {
	return String(name ?? '')
		.split('-')
		.map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
		.join(' ');
}
