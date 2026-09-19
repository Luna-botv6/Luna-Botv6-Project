import axios from 'axios'

const ITUNES_API = 'https://itunes.apple.com/search'

const handler = async (m, { text, conn }) => {
  const _tr = await global.loadTranslation((global.getIdioma?.(m)) || 'es')
  const t = _tr?.plugins?.buscador_peliculas || {}
  try {
    if (!text) throw (t.nombre_pelicula || '*Escribe el nombre de la película*')

    const pais = ((global.getIdioma?.(m)) || 'es').toLowerCase() === 'pt' ? 'BR' : 'MX'
    const url = `${ITUNES_API}?term=${encodeURIComponent(text)}&entity=movie&limit=10&country=${pais}`

    const { data } = await axios.get(url, { timeout: 20000 })
    const results = (data?.results || []).filter(v => v.trackName || v.trackCensoredName)

    if (!results || results.length === 0) {
      return conn.sendMessage(m.chat, {
        text: t.sin_resultados || '*No se encontraron resultados.*'
      }, { quoted: m })
    }

    const random = results[Math.floor(Math.random() * results.length)]

    const list = results.slice(0, 10).map((v, i) =>
      `*${i + 1}.* ${v.trackName || v.trackCensoredName}${v.releaseDate ? ` (${v.releaseDate.slice(0, 4)})` : ''}`
    ).join('\n\n')

    const img = (random.artworkUrl100 && random.artworkUrl100.replace('100x100', '600x600')) || 'https://i.imgur.com/7Q9G4aJ.png'

    const sinopsis = (random.longDescription || random.shortDescription || t.sin_sinopsis || '*Sin sinopsis disponible.*').slice(0, 500)

    const caption =
      (t.resultados?.replace('{text}', text) || `🎬 *Resultados de:* ${text}`) +
      '\n\n' + list +
      '\n\n━━━━━━━━━━━━━\n' +
      `📽️ *${random.trackName || random.trackCensoredName}*${random.releaseDate ? ` (${random.releaseDate.slice(0, 4)})` : ''}\n\n` +
      sinopsis

    await conn.sendMessage(m.chat, {
      image: { url: img },
      caption
    }, { quoted: m })

  } catch (err) {
    console.log(err)
    conn.sendMessage(m.chat, {
      text: t.error || '*Error al buscar la película.*'
    }, { quoted: m })
  }
}

handler.command = ['pelicula', 'peliculas', 'cine', 'buscarpelicula']
export default handler