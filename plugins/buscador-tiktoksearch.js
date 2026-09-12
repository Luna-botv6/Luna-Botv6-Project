import axios from 'axios'

let handler = async (m, { conn, text }) => {
    const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
    const t = _tr?.plugins?.buscador_tiktoksearch || {};
    if (!text) {
        return conn.sendMessage(m.chat, {
            text: t.sin_busqueda || '❗ Escribe qué quieres buscar.\n\nEjemplo:\n.tiktoksearch naruto'
        }, { quoted: m })
    }

    try {
        await conn.sendMessage(m.chat, {
            text: t.buscando || '🔎 Buscando videos en TikTok...'
        }, { quoted: m })

        const response = await tiktokSearch(text)

        if (!response.status) {
            throw new Error(response.resultado)
        }

        const results = response.resultado

        if (!results.length) {
            return conn.sendMessage(m.chat, {
                text: t.sin_resultados || '❌ No se encontraron resultados.'
            }, { quoted: m })
        }

        shuffleArray(results)

        const selected = results.slice(0, 3)

await conn.sendMessage(m.chat, {
    text:
`🎵 *TIKTOK SEARCH*

📌 ${t.busqueda || 'Búsqueda'}: ${text}
📊 ${t.resultados || 'Resultados'}: ${selected.length}

📦 ${t.preparando || 'Preparando álbum...'}`
}, { quoted: m })

try {
    await conn.sendMessage(
        m.chat,
        {
            album: selected.map(item => ({
                video: {
                    url: item.videoUrl
                },
                caption: `🎬 ${item.description || (t.sin_descripcion || 'Sin descripción')}`
            }))
        },
        { quoted: m }
    )
} catch (err) {
    console.error('Album error:', err)

    for (const item of selected) {
        try {
            await conn.sendMessage(
                m.chat,
                {
                    video: {
                        url: item.videoUrl
                    },
                    caption: `🎬 ${item.description || (t.sin_descripcion || 'Sin descripción')}`
                },
                { quoted: m }
            )
        } catch (e) {
            console.error(e)
        }
    }
}

    } catch (e) {
        await conn.sendMessage(m.chat, {
            text: (t.error?.replace('{msg}', e.message) || `❌ Error:\n${e.message}`)
        }, { quoted: m })
    }
}

handler.help = ['tiktoksearch <texto>']
handler.tags = ['buscador']
handler.command = /^(tiktoksearch|tiktoks)$/i

export default handler

async function tiktokSearch(query) {
    try {
        const response = await axios.post(
            'https://tikwm.com/api/feed/search',
            new URLSearchParams({
                keywords: query,
                count: '10',
                cursor: '0',
                HD: '1'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
                    Cookie: 'current_language=en'
                }
            }
        )

        const videos = response?.data?.data?.videos || []

        if (!videos.length) {
            return {
                status: false,
                resultado: 'No se encontraron videos.'
            }
        }

        return {
            status: true,
            resultado: videos.map(v => ({
                description: v.title || 'Sin descripción',
                videoUrl: v.play
            }))
        }

    } catch (error) {
        return {
            status: false,
            resultado: error.message
        }
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
    }
}

