// Makes candidate pictures for a theme with Leonardo.ai, from the theme's art-prompts.json.
// The pictures land in art-samples/<theme>/ to be looked at and chosen; nothing in the
// game changes until a chosen picture is copied into the theme's art/ folder.
//
//   LEONARDO_API_KEY=... npm run art -- bluey                  every picture
//   LEONARDO_API_KEY=... npm run art -- bluey bg-house pup-blue-happy   just these
//   LEONARDO_API_KEY=... npm run art -- --models               list the models
//
// Runs on GitHub when a pull request adds art-samples/WANTED (.github/workflows/art.yml),
// because Leonardo can't be reached from Claude's own environment.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const KEY = process.env.LEONARDO_API_KEY
const API = 'https://cloud.leonardo.ai/api/rest/v1'
const COUNT = Number(process.env.ART_COUNT || 2) // candidates per picture
const args = process.argv.slice(2)

async function call(method, path, body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
      body: body && JSON.stringify(body),
    })
    if (res.ok) return res.json()
    const msg = await res.text()
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 3000 * 2 ** attempt))
      continue
    }
    const err = new Error(`Leonardo said ${res.status} for ${method} ${path}: ${msg.slice(0, 400)}`)
    err.status = res.status
    throw err
  }
}

async function generate(body) {
  let job
  try {
    job = await call('POST', '/generations', body)
  } catch (e) {
    // Not every model can make a see-through background: try again without.
    if (e.status === 400 && body.transparency) {
      console.log(`  (no transparent background for this model: ${e.message.slice(0, 120)})`)
      const { transparency, ...rest } = body
      return generate(rest)
    }
    throw e
  }
  const id = job.sdGenerationJob?.generationId
  if (!id) throw new Error(`No generation id in ${JSON.stringify(job).slice(0, 300)}`)
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 4000))
    const g = (await call('GET', `/generations/${id}`)).generations_by_pk
    if (g?.status === 'COMPLETE') return g.generated_images.map((im) => im.url)
    if (g?.status === 'FAILED') throw new Error(`Generation ${id} failed`)
  }
  throw new Error(`Generation ${id} took too long`)
}

async function main() {
  if (!KEY) throw new Error('Set LEONARDO_API_KEY first.')
  if (args[0] === '--models') {
    const { custom_models } = await call('GET', '/platformModels')
    for (const m of custom_models) console.log(`${m.id}  ${m.name}`)
    return
  }
  const [theme, ...only] = args
  if (!theme) throw new Error('Name a theme, e.g. npm run art -- bluey')
  const spec = JSON.parse(readFileSync(join('public/content/themes', theme, 'art-prompts.json'), 'utf8'))
  const names = only.length ? only : Object.keys(spec.pictures)
  const out = join('art-samples', theme)
  mkdirSync(out, { recursive: true })
  const log = []
  for (const name of names) {
    const pic = spec.pictures[name]
    if (!pic) throw new Error(`No picture called ${name} in art-prompts.json`)
    const kind = spec.kinds[pic.kind]
    const prompt = `${spec.style}. ${kind.prompt}. ${pic.prompt}`
    const body = {
      modelId: pic.model || spec.model,
      prompt,
      negative_prompt: spec.negative,
      width: kind.width,
      height: kind.height,
      num_images: COUNT,
      ...(pic.seed ? { seed: pic.seed } : {}),
      ...(kind.transparent ? { transparency: 'foreground_only' } : {}),
    }
    console.log(`Making ${name}...`)
    const urls = await generate(body)
    for (const [i, url] of urls.entries()) {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Couldn't download ${url}: ${res.status}`)
      writeFileSync(join(out, `${name}-${i + 1}.png`), Buffer.from(await res.arrayBuffer()))
    }
    log.push({ name, prompt, count: urls.length })
  }
  writeFileSync(join(out, 'made.json'), JSON.stringify(log, null, 2) + '\n')
  console.log(`Done: ${log.length} pictures in ${out}/`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
