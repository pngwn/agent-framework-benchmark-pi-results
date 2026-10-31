import type { Route } from "./+types/not-found";
import { NotFound } from "../components/ui";

export const meta: Route.MetaFunction = () => [{ title: "Not found – Pokédex" }];

export default function NotFoundRoute() {
  return <NotFound />;
}
