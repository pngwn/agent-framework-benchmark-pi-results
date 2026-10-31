import { html } from '@gracile/gracile/server-html';

export const document = (props: { url: URL; title?: string | null }) => html`
	<!doctype html>
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<title>${props.title ?? 'Pokédex'}</title>
			<link rel="stylesheet" href="/styles/global.css" />
		</head>
		<body>
			<header class="site-header">
				<div class="site-header-inner container">
					<a class="brand" href="/">Pokédex</a>
					<nav aria-label="Main" class="site-nav">
						<a href="/">Pokémon</a>
						<a href="/types">Types</a>
					</nav>
				</div>
			</header>
			<route-template-outlet></route-template-outlet>
			<footer class="site-footer">
				<div class="container">
					<p>
						Data from PokéAPI. Pokémon and Pokémon character names are trademarks
						of Nintendo.
					</p>
				</div>
			</footer>
		</body>
	</html>
`;
