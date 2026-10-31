import { html } from '@gracile/gracile/server-html';

export const document = (props: { url: URL; title?: string | null }) => html`
	<!doctype html>
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />

			<link
				rel="stylesheet"
				href=${new URL('./document.css', import.meta.url).pathname}
			/>
			<script
				type="module"
				src=${new URL('./document.client.ts', import.meta.url).pathname}
			></script>

			<title>${props.title ?? 'Pokédex'}</title>
		</head>

		<body>
			<header class="site-header">
				<div class="wrap site-header-inner">
					<a class="site-brand" href="/">Pokédex</a>
					<nav class="site-nav">
						<a href="/">Pokémon</a>
						<a href="/types">Types</a>
					</nav>
				</div>
			</header>

			<route-template-outlet></route-template-outlet>

			<footer class="site-footer">
				<div class="wrap">
					<p>
						Data from PokéAPI. Pokémon and Pokémon character names are
						trademarks of Nintendo.
					</p>
				</div>
			</footer>
		</body>
	</html>
`;
