import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";

export default function NotFound() {
  return (
    <main class="page">
      <Title>Not found – Pokédex</Title>
      <HttpStatusCode code={404} />
      <h1>Not found</h1>
      <p class="not-found-link">
        <A href="/">Back to the Pokédex</A>
      </p>
    </main>
  );
}
