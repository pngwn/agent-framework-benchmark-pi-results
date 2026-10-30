import { data } from "react-router";
import { NotFoundPage } from "~/components/NotFoundPage";

export function loader() {
  return data(null, { status: 404 });
}

export function meta() {
  return [{ title: "Not found – Pokédex" }];
}

export default function NotFoundRoute() {
  return <NotFoundPage />;
}
