import type { MetaFunction } from "react-router";
import { NotFoundPage } from "../components/NotFoundPage";

export const meta: MetaFunction = () => [{ title: "Not found – Pokédex" }];

export default function NotFoundRoute() {
  return <NotFoundPage />;
}
