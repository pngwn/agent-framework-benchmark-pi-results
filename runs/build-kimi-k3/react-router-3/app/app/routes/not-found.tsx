import { data } from "react-router";
import type { Route } from "./+types/not-found";
import { NotFound } from "../components/ui";

export async function loader() {
  return data({}, { status: 404 });
}

export function meta() {
  return [{ title: "Not found – Pokédex" }];
}

export default function NotFoundPage() {
  return <NotFound />;
}
