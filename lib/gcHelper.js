import v8 from 'v8'

const GC_THRESHOLD = 70
const GC_COOLDOWN = 8000
const IDLE_TIMEOUT = 5 * 60 * 1000

let lastGC = 0
let idleTimer = null

export function gcIfNeeded(label = '') {
  if (!global.gc) return false
  const now = Date.now()
  if (now - lastGC < GC_COOLDOWN) return false

  const s = v8.getHeapStatistics()
  const pct = (s.used_heap_size / s.heap_size_limit) * 100
  if (pct < GC_THRESHOLD) return false

  global.gc()
  lastGC = now
  return true
}

export function gcForce(label = '') {
  if (!global.gc) return false
  global.gc()
  lastGC = Date.now()
  return true
}

export function notifyActivity() {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    gcForce('idle')
    idleTimer = null
  }, IDLE_TIMEOUT)
}
