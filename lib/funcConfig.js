import fs from 'fs'
const CONFIG_PATH = './database/config_grupos.json'

let configGrupos = {}

if (fs.existsSync(CONFIG_PATH)) {
  configGrupos = JSON.parse(fs.readFileSync(CONFIG_PATH))
} else {
  fs.writeFileSync(CONFIG_PATH, '{}')
  configGrupos = {}
}

function guardarConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(configGrupos, null, 2))
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
    if (config.disable) {
      if (!global.db.data.chats[id]) global.db.data.chats[id] = {}
      global.db.data.chats[id].disable = true
    }
    if (config.welcome !== undefined) {
      if (!global.db.data.chats[id]) global.db.data.chats[id] = {}
      global.db.data.chats[id].welcome = config.welcome
    }
    if (config.detect !== undefined) {
      if (!global.db.data.chats[id]) global.db.data.chats[id] = {}
      global.db.data.chats[id].detect = config.detect
    }
    if (config.antilink !== undefined) {
      if (!global.db.data.chats[id]) global.db.data.chats[id] = {}
      global.db.data.chats[id].antilink = config.antilink
    }
  }
}