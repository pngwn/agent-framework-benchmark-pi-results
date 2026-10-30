import { build } from 'esbuild'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
await fs.rm(dist, { recursive: true, force: true })
await fs.mkdir(path.join(dist, 'public'), { recursive: true })

await build({
  entryPoints: [path.join(root, 'src/server.tsx')],
  outfile: path.join(dist, 'server.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
  sourcemap: false,
  logLevel: 'info',
})

await fs.copyFile(path.join(root, 'public/styles.css'), path.join(dist, 'public/styles.css'))
await fs.copyFile(path.join(root, 'public/tokens.css'), path.join(dist, 'public/tokens.css'))
await fs.copyFile(
  path.join(root, 'node_modules/htmx.org/dist/htmx.min.js'),
  path.join(dist, 'public/htmx.min.js'),
)
