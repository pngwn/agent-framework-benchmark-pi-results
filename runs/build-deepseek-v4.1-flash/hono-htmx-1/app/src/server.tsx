import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getAbilityData,
  getGlobal,
  getHomeData,
  getMoveData,
  getMoveTables,
  getPokemonData,
  getTypeData,
} from './data'
import {
  AbilityPage,
  HomePage,
  HomeResults,
  Layout,
  MovePage,
  MoveTables,
  NotFoundPage,
  PokemonPage,
  TypePage,
  TypesPage,
} from './pages'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
const publicDir = [path.join(moduleDir, 'public'), path.join(moduleDir, '..', 'public')].find((dir) =>
  fs.existsSync(dir),
)!

const MIME: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

const app = new Hono()

function homePath(data: any, page: number): string {
  const params = new URLSearchParams()
  if (data.query) params.set('q', data.query)
  if (data.selectedType) params.set('type', data.selectedType.name)
  if (data.selectedGeneration) params.set('generation', data.selectedGeneration.name)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `/?${query}` : '/'
}

function isHtmx(c: any): boolean {
  return c.req.header('HX-Request') === 'true'
}

function notFound(c: any) {
  return c.html(<NotFoundPage />, 404)
}

function parseSort(raw: string | undefined) {
  if (!raw) return null
  const [method, column, direction] = raw.split(':')
  if (!method || !column) return null
  const columns = ['level', 'moveLabel', 'typeLabel', 'category', 'power', 'accuracy', 'pp']
  if (!columns.includes(column)) return null
  return { method, column, direction: direction === 'desc' ? 'desc' : 'asc' }
}

app.get('/static/:file', async (c) => {
  const file = c.req.param('file')
  if (!/^[a-zA-Z0-9._-]+$/.test(file)) return c.notFound()
  const full = path.join(publicDir, file)
  try {
    const contents = await fsp.readFile(full)
    return c.body(contents, 200, {
      'Content-Type': MIME[path.extname(full)] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    })
  } catch {
    return c.notFound()
  }
})

app.get('/', async (c) => {
  const page = Number.parseInt(c.req.query('page') ?? '1', 10)
  const data = await getHomeData(
    c.req.query('q') ?? '',
    c.req.query('type') ?? '',
    c.req.query('generation') ?? '',
    Number.isFinite(page) ? page : 1,
  )
  if (isHtmx(c)) {
    c.header('HX-Push-Url', homePath(data, data.currentPage))
    return c.html(<HomeResults data={data} />)
  }
  return c.html(<HomePage data={data} />)
})

app.get('/pokemon/:name', async (c) => {
  const name = c.req.param('name')
  const game = c.req.query('game') ?? ''
  const data = await getPokemonData(name, game)
  if (!data) return notFound(c)

  const tables = await getMoveTables(data.pokemon, data.selectedGame, data.global)
  const sort = parseSort(c.req.query('sort'))

  if (isHtmx(c)) {
    const gameParam = c.req.query('game')
    if (gameParam !== undefined) {
      const params = new URLSearchParams()
      if (data.selectedGame) params.set('game', data.selectedGame)
      const query = params.toString()
      c.header('HX-Push-Url', `/pokemon/${encodeURIComponent(data.species.name)}${query ? `?${query}` : ''}`)
    }
    return c.html(
      <MoveTables speciesName={data.species.name} game={data.selectedGame} tables={tables} sort={sort} />,
    )
  }

  return c.html(<PokemonPage data={data} tables={tables} sort={sort} />)
})

app.get('/moves/:name', async (c) => {
  const data = await getMoveData(c.req.param('name'))
  if (!data) return notFound(c)
  return c.html(<MovePage data={data} />)
})

app.get('/abilities/:name', async (c) => {
  const data = await getAbilityData(c.req.param('name'))
  if (!data) return notFound(c)
  return c.html(<AbilityPage data={data} />)
})

app.get('/types', async (c) => {
  const global = await getGlobal()
  return c.html(<TypesPage types={global.types} />)
})

app.get('/types/:name', async (c) => {
  const data = await getTypeData(c.req.param('name'))
  if (!data) return notFound(c)
  return c.html(<TypePage data={data} />)
})

app.notFound((c) => notFound(c))

app.onError((err, c) => {
  console.error(err)
  return c.html(
    <Layout title="Not found – Pokédex">
      <h1>Not found</h1>
      <p>
        <a href="/">Back to the Pokédex</a>
      </p>
    </Layout>,
    500,
  )
})

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Pokédex listening on http://localhost:${info.port}`)
})
