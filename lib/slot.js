import fs from 'fs/promises'
import path from 'path'

const dir = './database'
const statsFile = path.join(dir, 'stats.json')
const slotFile = path.join(dir, 'slot.json') // Para guardar cooldowns

// --- Funciones para stats.json ---
async function ensureDB() {
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch {}
  try {
    await fs.access(statsFile)
  } catch {
    await fs.writeFile(statsFile, '{}')
  }
}

async function readStats() {
  await ensureDB()
  try {
    const data = await fs.readFile(statsFile, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

async function writeStats(stats) {
  await fs.writeFile(statsFile, JSON.stringify(stats, null, 2))
}

export async function getExp(userId) {
  const stats = await readStats()
  return stats[userId]?.exp || 0
}

export async function addExp(userId, amount) {
  const stats = await readStats()
  if (!stats[userId]) stats[userId] = { exp: 0 }
  stats[userId].exp += amount
  await writeStats(stats)
}

export async function removeExp(userId, amount) {
  const stats = await readStats()
  if (!stats[userId]) stats[userId] = { exp: 0 }
  stats[userId].exp = Math.max(0, stats[userId].exp - amount)
  await writeStats(stats)
}

// --- Funciones para cooldown usando slot.json ---
async function readSlot() {
  try {
    const data = await fs.readFile(slotFile, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

async function writeSlot(data) {
  await fs.writeFile(slotFile, JSON.stringify(data, null, 2))
}

export async function canPlay(userId) {
  const slotData = await readSlot()
  const lastPlay = slotData[userId]?.lastPlay || 0
  const cooldown = 10 * 1000 // 10 segundos de cooldown
  return (Date.now() - lastPlay) > cooldown
}

export async function setCooldown(userId) {
  const slotData = await readSlot()
  slotData[userId] = { lastPlay: Date.now() }
  await writeSlot(slotData)
}

 