import fs from 'fs'

const PATH = './database/antispam.json'

if (!fs.existsSync(PATH)) fs.writeFileSync(PATH, JSON.stringify({}))

export function loadAntiSpam() {
  try {
    return JSON.parse(fs.readFileSync(PATH))
  } catch {
    return {}
  }
}

export function saveAntiSpam(data) {
  fs.writeFileSync(PATH, JSON.stringify(data, null, 2))
}