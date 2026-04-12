import fetch from 'node-fetch'

const API_URL = 'http://204.12.204.5:4017/scrape'
const TIMEOUT = 45000
const DEBUG = true

function log(tag, msg) {
  if (DEBUG) console.log(`[${tag}]`, msg)
}

async function scrapWithTimeout(url, tipo, selector = null) {
  log('SCRAPER', `Iniciando scrape: ${tipo} | URL: ${url}`)
  
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  
  try {
    const body = {
      url: url,
      tipo: tipo
    }
    if (selector) body.selector = selector

    log('SCRAPER', `Enviando request a ${API_URL}`)
    log('SCRAPER', `Body: ${JSON.stringify(body)}`)

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    log('SCRAPER', `Response status: ${response.status}`)
    
    clearTimeout(timer)
    const resultado = await response.json()
    
    log('SCRAPER', `Resultado recibido: ${JSON.stringify(resultado).substring(0, 200)}`)
    return resultado
    
  } catch (err) {
    clearTimeout(timer)
    log('SCRAPER-ERROR', `Error: ${err.message}`)
    throw err
  }
}

const handler = async (m, { conn, text, command, usedPrefix }) => {
  try {
    log('HANDLER', `Comando recibido: ${command} | Text: ${text}`)
    
    if (command === 'scrape') {
      log('HANDLER', 'Ejecutando comando scrape')
      
      if (!text) {
        log('HANDLER', 'Sin texto proporcionado')
        return await conn.reply(m.chat, '📍 Uso: scrape <url> <tipo>\n\nTipos: clima, imagenes, gifs, enlaces, texto', m)
      }

      const [url, tipo = 'texto'] = text.split('|').map(x => x.trim())
      log('HANDLER', `URL extraída: ${url} | Tipo: ${tipo}`)

      if (!url.startsWith('http')) {
        log('HANDLER', 'URL inválida')
        return await conn.reply(m.chat, '❌ URL inválida', m)
      }

      log('HANDLER', 'Enviando respuesta de carga')
      await conn.reply(m.chat, '⏳ Scrapeando...', m)

      log('HANDLER', 'Llamando a scrapWithTimeout')
      const resultado = await scrapWithTimeout(url, tipo)

      log('HANDLER', `Resultado obtenido: status=${resultado.status}`)
      
      if (!resultado.status) {
        log('HANDLER', `Error en resultado: ${resultado.error}`)
        return await conn.reply(m.chat, `❌ Error: ${resultado.error}`, m)
      }

      let respuesta = `✅ *Scraper*\n\n`
      respuesta += `📌 Tipo: ${tipo}\n`

      if (tipo === 'clima') {
        respuesta += `\n🌡️ *Datos del clima:*\n`
        respuesta += `Temperatura: ${resultado.datos.temperatura || '?'}\n`
        respuesta += `Descripción: ${resultado.datos.descripcion || '?'}\n`
        respuesta += `Ubicación: ${resultado.datos.ubicacion || '?'}\n`
        respuesta += `Sensación térmica: ${resultado.datos.sensacionTermica || '?'}\n`
        respuesta += `Humedad: ${resultado.datos.humedad || '?'}\n`
        respuesta += `Viento: ${resultado.datos.viento || '?'}\n`
        respuesta += `Presión: ${resultado.datos.presion || '?'}\n\n`
        respuesta += `🤖 API: 204.12.204.5:4017`
      } else if (tipo === 'imagenes' || tipo === 'gifs') {
        respuesta += `\n📷 *Encontradas:* ${resultado.cantidad}\n\n`
        respuesta += resultado.datos.slice(0, 5).map((img, i) => `${i + 1}. ${img.src.substring(0, 50)}...`).join('\n')
        if (resultado.cantidad > 5) respuesta += `\n... y ${resultado.cantidad - 5} más`
      } else if (tipo === 'enlaces') {
        respuesta += `\n🔗 *Encontrados:* ${resultado.cantidad}\n\n`
        respuesta += resultado.datos.slice(0, 5).map((a, i) => `${i + 1}. ${a.texto.substring(0, 40) || a.url.substring(0, 40)}...`).join('\n')
        if (resultado.cantidad > 5) respuesta += `\n... y ${resultado.cantidad - 5} más`
      } else {
        respuesta += `\n📊 *Elementos encontrados*`
      }

      await conn.reply(m.chat, respuesta, m)

    } else if (command === 'climap') {
      log('HANDLER', 'Ejecutando comando climap')
      
      if (!text) {
        log('HANDLER', 'Sin texto proporcionado para climap')
        return await conn.reply(m.chat, '🌡️ *Comando climap*\n\nUso: climap <ubicación>\n\nEjemplo:\nclimap vera santa fe argentina\nclimap buenos aires\nclimap madrid españa', m)
      }

      log('HANDLER', `Ubicación: ${text}`)
      await conn.reply(m.chat, '🌡️ Obteniendo clima de ' + text + '...', m)

      const url = `https://www.google.com/search?q=clima+${encodeURIComponent(text)}`
      log('HANDLER', `URL construida: ${url}`)
      
      try {
        log('HANDLER', 'Llamando a scrapWithTimeout para clima')
        const resultado = await scrapWithTimeout(url, 'clima')

        log('HANDLER', `Resultado clima: ${JSON.stringify(resultado).substring(0, 300)}`)

        if (!resultado.status) {
          log('HANDLER', `Error en clima: ${resultado.error}`)
          return await conn.reply(m.chat, `❌ No se pudo obtener el clima de "${text}"`, m)
        }

        log('HANDLER', 'Datos clima obtenidos, formateando respuesta')
        
        let respuesta = `🌡️ *Clima: ${text}*\n\n`
        respuesta += `━━━━━━━━━━━━━━━━━\n`
        respuesta += `🌡️ Temp: ${resultado.datos.temperatura || '?'}\n`
        respuesta += `📝 ${resultado.datos.descripcion || 'Información disponible'}\n`
        respuesta += `🤔 Sensación: ${resultado.datos.sensacionTermica || '?'}\n`
        respuesta += `💧 Humedad: ${resultado.datos.humedad || '?'}\n`
        respuesta += `💨 Viento: ${resultado.datos.viento || '?'}\n`
        respuesta += `🔽 Presión: ${resultado.datos.presion || '?'}\n`
        respuesta += `━━━━━━━━━━━━━━━━━\n`
        respuesta += `📍 Ubicación: ${resultado.datos.ubicacion || text}\n`
        respuesta += `⏰ Actualizado: ${new Date().toLocaleTimeString('es-AR')}\n\n`
        respuesta += `🤖 Bot Scraper • API v1`

        log('HANDLER', 'Enviando respuesta clima')
        await conn.reply(m.chat, respuesta, m)

      } catch (error) {
        log('HANDLER-ERROR', `Error clima: ${error.message}`)
        console.error('[Clima Error]', error.message)
        await conn.reply(m.chat, `❌ Error al procesar: ${text}\n\n${error.message}`, m)
      }
    }

  } catch (error) {
    log('HANDLER-CATCH', `Error general: ${error.message}`)
    console.error('[Scraper Error]', error)
    await conn.reply(m.chat, `❌ Error del sistema\n${error.message}`, m)
  }
}

handler.command = ['scrape', 'climap']
handler.tags = ['tools']
handler.help = ['scrape <url> <tipo>', 'climap <ubicación>']

export default handler