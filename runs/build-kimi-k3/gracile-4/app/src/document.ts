import { html } from '@gracile/gracile/server-html';

export const document = (props: { url: URL; title?: string | null }) => html`
	<!doctype html>
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />

			<link
				rel="stylesheet"
				href=${new URL('./styles/global.css', import.meta.url).pathname}
			/>

			<title>${props.title ? `${props.title} – Pokédex` : 'Pokédex'}</title>
		</head>

		<body>
			<header class="site-header">
				<div class="site-header-inner">
					<a class="brand" href="/">Pokédex</a>
					<nav>
						<a href="/">Pokémon</a>
						<a href="/types">Types</a>
					</nav>
				</div>
			</header>

			<route-template-outlet></route-template-outlet>

			<footer class="site-footer">
				<p>
					Data from PokéAPI. Pokémon and Pokémon character names are trademarks
					of Nintendo.
				</p>
			</footer>
		</body>
	</html>
`;
