import { html } from '@gracile/gracile/server-html';

export const document = (props) => html`
	<!doctype html>
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<title>${props.title ?? 'Pokédex'}</title>
			<link rel="stylesheet" href="/styles/tokens.css" />
			<link rel="stylesheet" href="/styles/app.css" />
		</head>

		<body>
			<header class="site-header">
				<div class="header-inner">
					<a class="brand" href="/">Pokédex</a>
					<nav class="site-nav" aria-label="Main">
						<a href="/">Pokémon</a>
						<a href="/types">Types</a>
					</nav>
				</div>
			</header>

			<main class="content">
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
