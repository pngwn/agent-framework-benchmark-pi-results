import { html } from '@gracile/gracile/server-html';

export const document = (props: { title?: string | null | undefined }) => html`
	<!doctype html>
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />

			<link
				rel="stylesheet"
				href=${new URL('./styles/app.css', import.meta.url).pathname}
			/>
			<script
				type="module"
				src=${new URL('./document.client.ts', import.meta.url).pathname}
			></script>

			<title>${props.title ? `${props.title} – Pokédex` : 'Pokédex'}</title>
		</head>

		<body>
			<header class="site-header">
				<div class="site-header__inner">
					<a class="site-header__home" href="/">Pokédex</a>
					<nav class="site-nav" aria-label="Main">
						<a href="/">Pokémon</a>
						<a href="/types">Types</a>
						<a href="/team">Team</a>
					</nav>
				</div>
			</header>

			<main class="page">
				<route-template-outlet></route-template-outlet>
			</main>

			<footer class="site-footer">
				<p>
					Data from PokéAPI. Pokémon and Pokémon character names are trademarks
					of Nintendo.
				</p>
			</footer>
		</body>
	</html>
`;
