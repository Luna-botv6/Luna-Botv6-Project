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

  const before = s.used_heap_size
  global.gc()
  lastGC = now

  const after = v8.getHeapStatistics().used_heap_size
  const freed = ((before - after) / 1024 / 1024).toFixed(2)
  const tag = label ? `[${label}]` : ''
  if (freed > 0.5) {
    console.log(`[GC]${tag} heap ${pct.toFixed(1)}% → liberó ${freed}MB`)
  }
  return true
}

export function gcForce(label = '') {
  if (!global.gc) return false
  const before = v8.getHeapStatistics().used_heap_size
  global.gc()
  lastGC = Date.now()
  const after = v8.getHeapStatistics().used_heap_size
  const freed = ((before - after) / 1024 / 1024).toFixed(2)
  const tag = label ? `[${label}]` : ''
  if (freed > 0.5) {
    console.log(`[GC-FORCE]${tag} liberó ${freed}MB`)
  }
  return true
}

export function notifyActivity() {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    const s = v8.getHeapStatistics()
    const heapMB = (s.used_heap_size / 1024 / 1024).toFixed(2)
    const pct = (s.used_heap_size / s.heap_size_limit * 100).toFixed(1)
    console.log(`[GC-IDLE] Sin actividad ${IDLE_TIMEOUT / 60000}min — heap ${heapMB}MB (${pct}%)`)
    gcForce('idle')
    idleTimer = null
  }, IDLE_TIMEOUT)
}