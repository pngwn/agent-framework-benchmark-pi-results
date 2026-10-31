import { NotFound } from "../components/not-found";

export function meta() {
  return [{ title: "Not found – Pokédex" }];
}

export default function NotFoundPage() {
  return <NotFound />;
}
