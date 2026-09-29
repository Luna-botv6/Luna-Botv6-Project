import { getUserStats, addExp as addExpStats } from './stats.js'

export function getExp(userId) {
  const stats = getUserStats(userId)
  return stats.exp || 0
}

export function addExp(userId, amount) {
  addExpStats(userId, amount)
}
