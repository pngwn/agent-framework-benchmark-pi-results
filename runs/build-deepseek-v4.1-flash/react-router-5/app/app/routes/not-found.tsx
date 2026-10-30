import type { Route } from "./+types/not-found";
import { NotFound } from "../components/NotFound";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Not found – Pokédex" }];
}

export function loader() {
  return Response.json({ notFound: true }, { status: 404 });
}

export default function NotFoundRoute() {
  return <NotFound />;
}
