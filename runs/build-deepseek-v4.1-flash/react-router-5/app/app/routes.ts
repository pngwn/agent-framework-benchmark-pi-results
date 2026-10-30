import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("pokemon/:name", "routes/pokemon.tsx"),
  route("moves/:name", "routes/move.tsx"),
  route("abilities/:name", "routes/ability.tsx"),
  route("types", "routes/types.tsx"),
  route("types/:name", "routes/type.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
