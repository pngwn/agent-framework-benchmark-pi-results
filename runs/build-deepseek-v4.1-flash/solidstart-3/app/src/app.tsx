import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import "./tokens.css";
import "./app.css";

export default function App() {
  if (typeof document !== "undefined") document.documentElement.lang = "en";
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Title>Pokédex</Title>
          <div class="app-shell">
            <Header />
            <Suspense>{props.children}</Suspense>
            <Footer />
          </div>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
