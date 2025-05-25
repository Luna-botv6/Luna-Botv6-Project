import { join } from 'path'
import { Low, JSONFile } from 'lowdb'

const file = join('./database/', 'tictactoe-db.json')
const adapter = new JSONFile(file)
const db = new Low(adapter)

await db.read()
db.data ||= { users: {} }
await db.write()

export const getUser = async (id) => {
  await db.read()
  db.data.users[id] ||= { exp: 0 }
  await db.write()
  return db.data.users[id]
}

export const updateUserExp = async (id, amount) => {
  await db.read()
  db.data.users[id] ||= { exp: 0 }
  db.data.users[id].exp += amount
  await db.write()
}

export default db