import { MetaProvider } from "@solidjs/meta";
import { A, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { TeamProvider } from "~/lib/team";
import "./tokens.css";
import "./app.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <TeamProvider>
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
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
