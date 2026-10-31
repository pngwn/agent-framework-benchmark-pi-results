import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    port: Number(process.env.PORT ?? 3000),
  },
  plugins: [tanstackStart(), nitro(), viteReact()],
})
