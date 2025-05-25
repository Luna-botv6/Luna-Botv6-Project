import { getUserStats, setUserStats } from './stats.js'

export function getExp(userId) {
  const stats = getUserStats(userId)
  return stats.exp || 0
}

export function addExp(userId, amount) {
  const stats = getUserStats(userId)
  stats.exp += amount
  setUserStats(userId, stats)
}
