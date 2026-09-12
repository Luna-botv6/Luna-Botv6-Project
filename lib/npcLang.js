import fs from 'fs'

const _cache = {}

export function idiomaDelUsuario(id) {
  const idioma = global?.db?.data?.users?.[id]?.language || global?.defaultLenguaje || 'es'
  return ['es', 'en', 'pt'].includes(idioma) ? idioma : 'es'
}

export function getNpcLang(id, seccion = 'rpg_npc') {
  const idioma = idiomaDelUsuario(id)
  if (_cache[idioma]) return _cache[idioma]?.[seccion] || {}
  try {
    const raw = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8'))
    _cache[idioma] = raw?.plugins || {}
    return _cache[idioma]?.[seccion] || {}
  } catch {
    try {
      const raw = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8'))
      _cache[idioma] = raw?.plugins || {}
    } catch {
      _cache[idioma] = {}
    }
    return _cache[idioma]?.[seccion] || {}
  }
}

export function tpl(str, datos = {}) {
  return String(str || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (datos[k] ?? ''))
}

export function getNpcNames(id, keys) {
  const t = getNpcLang(id)
  const arr = []
  for (const k of keys) {
    const v = t[k]
    if (Array.isArray(v) && v.length) arr.push(...v)
  }
  return arr
}