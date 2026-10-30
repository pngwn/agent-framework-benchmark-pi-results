# Pokédex (SvelteKit)

A Pokédex backed by the local PokeAPI server. Built with SvelteKit 3 and `@sveltejs/adapter-node`.

```sh
npm install
npm run build
API_BASE_URL=http://localhost:9000 PORT=3000 npm start
```

All data is fetched from `API_BASE_URL` at request time in server `load` functions
(`src/lib/server/`), with a short-lived in-memory cache. Nothing is prerendered.
