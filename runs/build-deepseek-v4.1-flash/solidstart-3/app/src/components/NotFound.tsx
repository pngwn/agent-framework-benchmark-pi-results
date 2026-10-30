import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";

export default function NotFound() {
  return (
    <main class="container">
      <Title>Not found – Pokédex</Title>
      <h1>Not found</h1>
      <p>
        <A href="/">Back to the Pokédex</A>
      </p>
    </main>
  );
}
