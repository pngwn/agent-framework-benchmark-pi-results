import { MetaProvider } from "@solidjs/meta";
import { A, createAsync, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Show, Suspense, type JSX } from "solid-js";
import { getTeamNames } from "~/lib/queries";
import { TeamProvider } from "~/lib/team";
import "./tokens.css";
import "./app.css";

function Shell(props: { children: JSX.Element }) {
  const names = createAsync(() => getTeamNames());
  return (
    <Show when={names()}>
      {(initial) => (
        <TeamProvider initial={initial()}>
          <header class="site-header">
            <div class="container site-header__inner">
              <A href="/" class="site-header__brand" end>
                Pokédex
              </A>
              <nav aria-label="Main">
                <ul class="site-nav">
                  <li>
                    <A href="/" end>
                      Pokémon
                    </A>
                  </li>
                  <li>
                    <A href="/types">Types</A>
                  </li>
                  <li>
                    <A href="/team">Team</A>
                  </li>
                </ul>
              </nav>
            </div>
          </header>
          <main class="container site-main">
            <Suspense>{props.children}</Suspense>
          </main>
          <footer class="site-footer">
            <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
          </footer>
        </TeamProvider>
      )}
    </Show>
  );
}

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Suspense fallback={null}>
            <Shell>{props.children}</Shell>
          </Suspense>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
