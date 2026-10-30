import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
import { pageTitle } from "~/lib/format";

export default function NotFound() {
  return (
    <>
      <Title>{pageTitle("Not found")}</Title>
      <HttpStatusCode code={404} />
      <h1 class="page-title">Not found</h1>
      <p>
        <A href="/">Back to the Pokédex</A>
      </p>
    </>
  );
}
