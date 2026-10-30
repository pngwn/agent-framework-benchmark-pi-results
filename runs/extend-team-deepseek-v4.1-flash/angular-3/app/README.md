# Pokédex

An Angular app for browsing Pokémon, moves, abilities and types. It reads everything from
a PokeAPI-compatible server.

## Commands

- `npm run build`: production build (browser bundle + SSR server).
- `npm start`: serves the build on `$PORT` (default `3000`).
- `npm run dev`: development server.
- `npm test`: unit tests.

Both `build` and `start` read `API_BASE_URL` (default `http://localhost:9000`).

## How it works

- Every page is rendered on the server per request (`RenderMode.Server`). Nothing is
  prerendered, because the API data can change at any time.
- `src/server/loaders.ts` builds a compact view model for each page from live API data.
  `src/server/api-client.ts` keeps API responses in memory for 60 seconds.
- On the server, route resolvers call the loaders directly and hand the result to the
  browser through `TransferState`, so hydration doesn't refetch anything. For client-side
  navigation the browser fetches the same view models from `/_data/...` (see
  `src/server.ts`). That keeps payloads small: a Pokémon page needs dozens of large API
  documents but only a few kilobytes of view model.
- Sprites and artwork load straight from the API server's `/media/`.
