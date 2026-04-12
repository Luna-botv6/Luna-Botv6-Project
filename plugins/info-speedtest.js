import cp from 'child_process'
import { promisify } from 'util'
import os from 'os'
import fs from 'fs'
import v8 from 'v8'

const exec = promisify(cp.exec).bind(cp)

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatSpeed = (bps) => {
  const mbps = (bps / 1000000).toFixed(2)
  const kbps = (bps / 1000).toFixed(2)
  return mbps >= 1 ? `${mbps} Mbps` : `${kbps} Kbps`
}

const formatUptime = (ms) => {
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0) parts.push(`${seconds}s`)
  return parts.join(' ') || '0s'
}

const getRealMemory = async () => {
  try {
    if (fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes')) {
      const limit = fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim()
      const usage = fs.readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8').trim()
      const limitBytes = parseInt(limit)
      const usageBytes = parseInt(usage)
      if (limitBytes > 0 && limitBytes < 9007199254740991) return { total: limitBytes, used: usageBytes, free: limitBytes - usageBytes }
    }
    if (fs.existsSync('/sys/fs/cgroup/memory.max')) {
      const limit = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim()
      const usage = fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim()
      if (limit !== 'max') {
        const limitBytes = parseInt(limit)
        const usageBytes = parseInt(usage)
        if (limitBytes > 0) return { total: limitBytes, used: usageBytes, free: limitBytes - usageBytes }
      }
    }
    const { stdout: meminfoData } = await exec('cat /proc/meminfo 2>/dev/null')
    if (meminfoData) {
      const totalMatch = meminfoData.match(/MemTotal:\s+(\d+)\s+kB/)
      const availMatch = meminfoData.match(/MemAvailable:\s+(\d+)\s+kB/)
      if (totalMatch) {
        const totalBytes = parseInt(totalMatch[1]) * 1024
        const availBytes = availMatch ? parseInt(availMatch[1]) * 1024 : 0
        return { total: totalBytes, used: totalBytes - availBytes, free: availBytes }
      }
    }
  } catch (error) {}
  const totalBytes = os.totalmem()
  const freeBytes = os.freemem()
  return { total: totalBytes, used: totalBytes - freeBytes, free: freeBytes }
}

const getNodeMemory = () => {
  const heapStats = v8.getHeapStatistics()
  return {
    heapUsed: heapStats.used_heap_size,
    heapTotal: heapStats.heap_size_limit,
    heapPercent: ((heapStats.used_heap_size / heapStats.heap_size_limit) * 100).toFixed(1)
  }
}

const getConnectionStats = (conn) => {
  try {
    const chats = conn?.chats || global.conn?.chats || {}
    const allChats = Object.keys(chats)
    return {
      grupos: allChats.filter(jid => jid.endsWith('@g.us')).length,
      privados: allChats.filter(jid => jid.endsWith('@s.whatsapp.net')).length,
      total: allChats.length
    }
  } catch (e) {
    return { grupos: 0, privados: 0, total: 0 }
  }
}

const getStartTime = () => {
  const timestampConnect = global.timestamp?.connect?.getTime()
  const timestampStart = global.timestamp?.start?.getTime()
  const processStart = Date.now() - (process.uptime() * 1000)
  return timestampConnect || timestampStart || processStart
}

const analyzePerformance = (download, upload, ping, systemInfo, t) => {
  const issues = []
  const downloadMbps = download / 1000000
  const uploadMbps = upload / 1000000
  if (downloadMbps < 5) issues.push(t.warn_descarga)
  if (uploadMbps < 2) issues.push(t.warn_subida)
  if (ping > 100) issues.push(t.warn_ping)
  if (parseFloat(systemInfo.memPercent) > 85) issues.push(t.warn_ram)
  if (parseFloat(systemInfo.heapPercent) > 80) issues.push(t.warn_heap)
  if (systemInfo.cpuLoad / systemInfo.cpuCount > 0.8) issues.push(t.warn_cpu)

  let diagnosis = `${t.estado_optimo}\n`
  if (issues.length > 0) {
    diagnosis = `${t.estado_problemas}\n\n` + issues.join('\n') + '\n\n'
    if (downloadMbps < 5 || uploadMbps < 2 || ping > 100) {
      diagnosis += `📡 *${t.causa}* ${t.causa_internet}\n💡 *${t.solucion}* ${t.sol_internet}\n`
    } else if (parseFloat(systemInfo.memPercent) > 85 || parseFloat(systemInfo.heapPercent) > 80) {
      diagnosis += `🖥️ *${t.causa}* ${t.causa_ram}\n💡 *${t.solucion}* ${t.sol_ram}\n`
    } else if (systemInfo.cpuLoad / systemInfo.cpuCount > 0.8) {
      diagnosis += `⚙️ *${t.causa}* ${t.causa_cpu}\n💡 *${t.solucion}* ${t.sol_cpu}\n`
    }
  }
  return diagnosis
}

const handler = async (m, { conn }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.info_speedtest

  await m.reply(t.cargando)

  try {
    const startTime = Date.now()
    const memInfo = await getRealMemory()
    const nodeMemInfo = getNodeMemory()
    const memPercent = ((memInfo.used / memInfo.total) * 100).toFixed(1)
    const cpuLoad = os.loadavg()[0].toFixed(2)
    const cpuCount = os.cpus().length
    const stats = getConnectionStats(conn)
    const platform = os.platform()
    const nodeVersion = process.version
    const botStartTime = getStartTime()
    const uptime = Date.now() - botStartTime
    const fechaInicio = new Date(botStartTime)
    const formatoFecha = (fecha) => fecha.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const systemInfo = { memPercent, heapPercent: nodeMemInfo.heapPercent, cpuLoad, cpuCount }

    const { stdout, stderr } = await exec('python3 ./src/libraries/ookla-speedtest.py --secure --share', { timeout: 60000 })
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1)
    const output = stdout || stderr

    if (!output.trim()) throw new Error('No response from speed test')

    const downloadMatch = output.match(/\*Descarga:\*\s*([0-9.]+)\s*(Mbit\/s|Kbit\/s|Gbit\/s|Mbps|Kbps|Gbps)/i) || output.match(/Download[:\s]+([0-9.]+)\s*(Mbit\/s|Kbit\/s|Gbit\/s|Mbps|Kbps|Gbps)/i)
    const uploadMatch = output.match(/\*Subida:\*\s*([0-9.]+)\s*(Mbit\/s|Kbit\/s|Gbit\/s|Mbps|Kbps|Gbps)/i) || output.match(/Upload[:\s]+([0-9.]+)\s*(Mbit\/s|Kbit\/s|Gbit\/s|Mbps|Kbps|Gbps)/i)
    const pingMatch = output.match(/\*Latencia:\*\s*([0-9.]+)\s*ms/i) || output.match(/Ping[:\s]+([0-9.]+)\s*ms/i)
    const imageMatch = output.match(/http[^"\s]+\.png/)

    const convertToBps = (value, unit) => {
      if (!unit) return value * 1000000
      const u = unit.toLowerCase()
      if (u.includes('gbit') || u.includes('gbps')) return value * 1000000000
      if (u.includes('mbit') || u.includes('mbps')) return value * 1000000
      if (u.includes('kbit') || u.includes('kbps')) return value * 1000
      return value * 1000000
    }

    const download = downloadMatch ? convertToBps(parseFloat(downloadMatch[1]), downloadMatch[2]) : 0
    const upload = uploadMatch ? convertToBps(parseFloat(uploadMatch[1]), uploadMatch[2]) : 0
    const ping = pingMatch ? parseFloat(pingMatch[1]) : 0
    const imageUrl = imageMatch ? imageMatch[0] : null
    const diagnosis = analyzePerformance(download, upload, ping, systemInfo, t)

    const getStatusEmoji = () => {
      const memPct = parseFloat(memPercent)
      const heapPct = parseFloat(nodeMemInfo.heapPercent)
      if (memPct > 90 || heapPct > 90) return '🔴'
      if (memPct > 75 || heapPct > 75) return '🟡'
      return '🟢'
    }

    let message = `${t.titulo}\n\n`
    message += `${getStatusEmoji()} ${t.estado_general}\n${diagnosis}\n`
    message += `${t.uptime_titulo}\n`
    message += `├ 🚀 ${t.iniciado} ${formatoFecha(fechaInicio)}\n`
    message += `├ ⏳ ${t.uptime} ${formatUptime(uptime)}\n`
    message += `└ ⏱️ ${t.test} ${executionTime}s\n\n`
    message += `${t.chats_titulo}\n`
    message += `├ 👥 ${t.grupos} ${stats.grupos}\n`
    message += `├ 👤 ${t.privados} ${stats.privados}\n`
    message += `└ 📊 ${t.total} ${stats.total}\n\n`
    message += `${t.red_titulo}\n`
    message += `├ ${t.descarga} ${formatSpeed(download)}\n`
    message += `├ ${t.subida} ${formatSpeed(upload)}\n`
    message += `└ ${t.ping} ${ping.toFixed(2)} ms\n\n`
    message += `${t.ram_titulo}\n`
    message += `├ 📦 ${t.ram} ${formatBytes(memInfo.used)} / ${formatBytes(memInfo.total)}\n`
    message += `├ 📈 ${t.uso} ${memPercent}%\n`
    message += `└ 🆓 ${t.libre} ${formatBytes(memInfo.free)}\n\n`
    message += `${t.node_titulo}\n`
    message += `├ 🔧 ${t.heap} ${formatBytes(nodeMemInfo.heapUsed)} / ${formatBytes(nodeMemInfo.heapTotal)}\n`
    message += `└ 📊 ${t.uso} ${nodeMemInfo.heapPercent}%\n\n`
    message += `${t.cpu_titulo}\n`
    message += `├ 🖥️ ${t.cpu} ${cpuLoad} / ${cpuCount} cores\n`
    message += `├ 🐧 ${t.sistema} ${platform}\n`
    message += `└ 📗 Node.js: ${nodeVersion}\n\n`
    message += `╰━━━━━━━━━━━━━━━━━━━━━━━╯`

    if (imageUrl) {
      await conn.sendMessage(m.chat, { image: { url: imageUrl }, caption: message }, { quoted: m })
    } else {
      await m.reply(message)
    }

  } catch (e) {
    const memInfo = await getRealMemory()
    const nodeMemInfo = getNodeMemory()
    const memPercent = ((memInfo.used / memInfo.total) * 100).toFixed(1)
    const cpuLoad = os.loadavg()[0].toFixed(2)
    const cpuCount = os.cpus().length
    const stats = getConnectionStats(conn)
    const uptime = Date.now() - getStartTime()

    let errorMsg = `${t.error_titulo}\n\n`
    errorMsg += `📛 ${t.error_label} ${e.message}\n\n`
    errorMsg += `${t.uptime_bot}\n└ ⏳ ${t.activo} ${formatUptime(uptime)}\n\n`
    errorMsg += `${t.chats_activos}\n└ 👥 ${t.grupos} ${stats.grupos} | 👤 ${t.privados} ${stats.privados}\n\n`
    errorMsg += `${t.diagnostico}\n`
    errorMsg += `├ 💾 ${t.ram} ${formatBytes(memInfo.used)} / ${formatBytes(memInfo.total)} (${memPercent}%)\n`
    errorMsg += `├ 🧠 ${t.heap} ${formatBytes(nodeMemInfo.heapUsed)} / ${formatBytes(nodeMemInfo.heapTotal)} (${nodeMemInfo.heapPercent}%)\n`
    errorMsg += `└ ⚙️ ${t.cpu} ${cpuLoad} / ${cpuCount} cores\n\n`

    if (e.message.includes('timeout')) {
      errorMsg += `⚠️ *${t.causa}* ${t.causa_timeout}\n💡 *${t.solucion}* ${t.sol_timeout}\n`
    } else if (e.message.includes('ENOENT') || e.message.includes('python')) {
      errorMsg += `⚠️ *${t.causa}* ${t.causa_python}\n💡 *${t.solucion}* ${t.sol_python}\n`
    } else if (parseFloat(memPercent) > 90) {
      errorMsg += `⚠️ *${t.causa}* ${t.causa_memoria}\n💡 *${t.solucion}* ${t.sol_memoria}\n`
    } else {
      errorMsg += `⚠️ *${t.causa}* ${t.causa_desconocida}\n💡 *${t.solucion}* ${t.sol_desconocida}\n`
    }

    return m.reply(errorMsg)
  }
}

handler.help = ['speedtest']
handler.tags = ['info']
handler.command = /^(speedtest?|test?speed|velocidad)$/i

export default handler
