import fs from 'fs'
import fetch from 'node-fetch'

const FILE_PATH = './src/data/waifus.json'

const RAREZAS = [
  { tipo: 'Común', prob: 50, mult: 1 },
  { tipo: 'Rara', prob: 25, mult: 2 },
  { tipo: 'Épica', prob: 15, mult: 3 },
  { tipo: 'Legendaria', prob: 8, mult: 5 },
  { tipo: 'Mítica', prob: 2, mult: 10 }
]

async function fetchPersonajes(page = 1, perPage = 50) {
  const query = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      characters(sort: FAVOURITES_DESC) {
        id
        name { full }
        image { large }
        media(sort: POPULARITY_DESC, type: ANIME, perPage: 1) {
          nodes { title { romaji } }
        }
        description(asHtml: false)
      }
    }
  }`

  const variables = { page, perPage }
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })

  const json = await res.json()
  return json.data.Page.characters
}

function generarRareza() {
  const rand = Math.random() * 100
  let acumulado = 0
  for (const r of RAREZAS) {
    acumulado += r.prob
    if (rand <= acumulado) return r
  }
  return RAREZAS[0]
}

const handler = async (m, { conn }) => {
  try {
    await conn.sendMessage(m.chat, { text: '🔄 Actualizando base de waifus desde AniList...' }, { quoted: m })
    const personajes = await fetchPersonajes(1, 50)
    const lista = personajes.map(p => {
      const rareza = generarRareza()
      const anime = p.media?.nodes?.[0]?.title?.romaji || 'Desconocido'
      const valor = Math.floor(Math.random() * 1000 * rareza.mult) + 100
      return {
        id: p.id,
        nombre: p.name.full,
        anime,
        imagen: p.image.large,
        rareza: rareza.tipo,
        valor,
        descripcion: p.description ? p.description.replace(/<[^>]+>/g, '').slice(0, 300) : 'Sin descripción disponible.'
      }
    })

    if (!fs.existsSync('./src/data')) fs.mkdirSync('./src/data', { recursive: true })
    fs.writeFileSync(FILE_PATH, JSON.stringify(lista, null, 2))

    await conn.sendMessage(m.chat, { text: `✅ Se actualizaron ${lista.length} waifus correctamente.` }, { quoted: m })
  } catch (err) {
    console.error(err)
    m.reply('❌ Error al actualizar waifus. Intenta más tarde.')
  }
}

handler.help = ['updatewaifus']
handler.tags = ['gacha']
handler.command = /^updatewaifus$/i
handler.owner = true
export default handler
