import { query } from "@solidjs/router";
import {
  loadAbilityPage,
  loadHome,
  loadMovePage,
  loadPokemonPage,
  loadTypeList,
  loadTypePage,
  type HomeParams,
} from "./data";

export const homeQuery = query(
  (params: HomeParams) => loadHome(params),
  "home",
);

export const pokemonQuery = query(
  (name: string, game: string) => loadPokemonPage(name, game),
  "pokemon",
);

export const moveQuery = query(
  (name: string) => loadMovePage(name),
  "move",
);

export const abilityQuery = query(
  (name: string) => loadAbilityPage(name),
  "ability",
);

export const typeListQuery = query(() => loadTypeList(), "type-list");

export const typeQuery = query(
  (name: string) => loadTypePage(name),
  "type",
);
