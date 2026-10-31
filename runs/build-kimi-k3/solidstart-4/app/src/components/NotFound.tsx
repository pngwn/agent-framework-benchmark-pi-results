import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";

export function NotFound() {
  return (
    <>
      <HttpStatusCode code={404} />
      <Title>Not found – Pokédex</Title>
      <h1>Not found</h1>
      <p>
        <A href="/">Back to the Pokédex</A>
      </p>
    </>
  );
}
