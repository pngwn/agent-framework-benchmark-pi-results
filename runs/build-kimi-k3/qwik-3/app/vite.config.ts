/**
 * Base vite config. The adapter config extends this for the server build.
 * The qwikCity plugin makes the build start at `src/entry.ssr.tsx` instead of index.html.
 */
import { defineConfig, type UserConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";

export default defineConfig((): UserConfig => {
  return {
    plugins: [qwikCity(), qwikVite()],
    server: {
      headers: {
        "Cache-Control": "public, max-age=0",
      },
    },
  };
});
