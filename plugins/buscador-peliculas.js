import axios from 'axios'
import cheerio from 'cheerio'
import fs from 'fs'

const handler = async (m, { text, conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.buscador_peliculas || {};
  try {
    if (!text) throw (t.nombre_pelicula || '*Escribe el nombre de la película*')

    const results = await searchCuevana(text)

    if (!results || results.length === 0) {
      return conn.sendMessage(m.chat, {
        text: t.sin_resultados || '*No se encontraron resultados.*'
      }, { quoted: m })
    }

    const random = results[Math.floor(Math.random() * results.length)]

    const list = results.slice(0, 10).map((v, i) =>
      `*${i + 1}.* ${v.title}\n${v.link}`
    ).join('\n\n')

    const img = random.image || 'https://i.imgur.com/7Q9G4aJ.png'

    await conn.sendMessage(m.chat, {
      image: { url: img },
      caption: (t.resultados?.replace('{text}', text) + '\n\n' + list) || `🎬 *Resultados de:* ${text}\n\n${list}`
    }, { quoted: m })

  } catch (err) {
    console.log(err)
    conn.sendMessage(m.chat, {
      text: t.error || '*Error al buscar la película.*'
    }, { quoted: m })
  }
}

handler.command = ['cuevana']
export default handler


// 🔎 SCRAPER SIMPLE
async function searchCuevana(query) {
  const url = `https://cuevana3.cl/?s=${encodeURIComponent(query)}`

  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  })

  const $ = cheerio.load(data)
  const results = []

  $('.result-item, .TPostMv, article').each((_, el) => {
    const title =
      $(el).find('a').attr('title') ||
      $(el).find('img').attr('alt') ||
      $(el).text().trim()

    const link = $(el).find('a').attr('href')
    const image = $(el).find('img').attr('src')

    if (title && link) {
      results.push({ title, link, image })
    }
  })

  return results
}