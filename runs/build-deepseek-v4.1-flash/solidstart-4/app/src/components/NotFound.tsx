import { Title } from "@solidjs/meta";
import { HttpStatusCode } from "@solidjs/start";

export default function NotFound() {
  return (
    <>
      <Title>Not found – Pokédex</Title>
      <HttpStatusCode code={404} />
      <h1>Not found</h1>
      <p>
        <a href="/">Back to the Pokédex</a>
      </p>
    </>
  );
}
