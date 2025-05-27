import fs from 'fs'
const CONFIG_PATH = './database/config_grupos.json'

let configGrupos = {}

try {
  if (fs.existsSync(CONFIG_PATH)) {
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8')
    configGrupos = JSON.parse(data)
  } else {
    fs.writeFileSync(CONFIG_PATH, '{}', 'utf-8')
    configGrupos = {}
  }
} catch (err) {
  console.error('[ERROR] Al leer o crear config_grupos.json:', err)
  configGrupos = {}
}

function guardarConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(configGrupos, null, 2), 'utf-8')
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
