const _dynamicIds = new Map()
const TTL = 30 * 60 * 1000

export function registerDynamicMessage(id) {
  if (!id) return
  _dynamicIds.set(id, Date.now())
}

export function isDynamicMessage(id) {
  if (!id) return false
  const ts = _dynamicIds.get(id)
  if (!ts) return false
  if (Date.now() - ts > TTL) {
    _dynamicIds.delete(id)
    return false
  }
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [id, ts] of _dynamicIds) {
    if (now - ts > TTL) _dynamicIds.delete(id)
  }
}, 10 * 60 * 1000)
