import fs from 'fs'
import path from 'path'

const CONFIG_DIR = './database'
const CONFIG_PATH = path.join(CONFIG_DIR, 'config_grupos.json')

let configGrupos = {}


if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
}


if (fs.existsSync(CONFIG_PATH)) {
  try {
    configGrupos = JSON.parse(fs.readFileSync(CONFIG_PATH))
  } catch (e) {
    console.error('[❌ ERROR] Al leer config_grupos.json:', e)
    configGrupos = {}
  }
} else {
  fs.writeFileSync(CONFIG_PATH, '{}')
  configGrupos = {}
}


function guardarConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configGrupos, null, 2))
  } catch (e) {
    console.error('[❌ ERROR] Al guardar config_grupos.json:', e)
  }
}


export function setConfig(id, key, value) {
  if (!configGrupos[id]) configGrupos[id] = {}
  configGrupos[id][key] = value
  guardarConfig()
}

export function getConfig(id, key) {
  return configGrupos[id]?.[key] ?? null
}

export function restaurarConfiguraciones(conn) {
  for (const id in configGrupos) {
    const config = configGrupos[id]
    if (!global.db.data.chats[id]) global.db.data.chats[id] = {}

    if (config.disable) global.db.data.chats[id].disable = true
    if (config.welcome !== undefined) global.db.data.chats[id].welcome = config.welcome
    if (config.detect !== undefined) global.db.data.chats[id].detect = config.detect
    if (config.antilink !== undefined) global.db.data.chats[id].antilink = config.antilink
  }
}
