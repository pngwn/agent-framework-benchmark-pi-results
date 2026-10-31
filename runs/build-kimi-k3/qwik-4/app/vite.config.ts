import { defineConfig, type UserConfig } from 'vite';
import { qwikVite } from '@builder.io/qwik/optimizer';
import { qwikCity } from '@builder.io/qwik-city/vite';

export default defineConfig((): UserConfig => {
  return {
    plugins: [qwikCity({ trailingSlash: false }), qwikVite()],
  };
});
