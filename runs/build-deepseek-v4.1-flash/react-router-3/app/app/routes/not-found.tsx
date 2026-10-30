import { NotFound } from "../components/NotFound";

export function meta() {
  return [{ title: "Not found – Pokédex" }];
}

export default function NotFoundRoute() {
  return <NotFound />;
}
