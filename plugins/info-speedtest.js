import cp from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs';
import v8 from 'v8';

const exec = promisify(cp.exec).bind(cp);

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatSpeed = (bps) => {
    const mbps = (bps / 1000000).toFixed(2);
    const kbps = (bps / 1000).toFixed(2);
    return mbps >= 1 ? `${mbps} Mbps` : `${kbps} Kbps`;
};

const formatUptime = (ms) => {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  
  return parts.join(' ') || '0s';
};

const getRealMemory = async () => {
    try {
        if (fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes')) {
            const limit = fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim();
            const usage = fs.readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8').trim();
            const limitBytes = parseInt(limit);
            const usageBytes = parseInt(usage);
            
            if (limitBytes > 0 && limitBytes < 9007199254740991) {
                return {
                    total: limitBytes,
                    used: usageBytes,
                    free: limitBytes - usageBytes
                };
            }
        }

        if (fs.existsSync('/sys/fs/cgroup/memory.max')) {
            const limit = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
            const usage = fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim();
            
            if (limit !== 'max') {
                const limitBytes = parseInt(limit);
                const usageBytes = parseInt(usage);
                
                if (limitBytes > 0) {
                    return {
                        total: limitBytes,
                        used: usageBytes,
                        free: limitBytes - usageBytes
                    };
                }
            }
        }

        const { stdout: meminfoData } = await exec('cat /proc/meminfo 2>/dev/null');
        if (meminfoData) {
            const totalMatch = meminfoData.match(/MemTotal:\s+(\d+)\s+kB/);
            const availMatch = meminfoData.match(/MemAvailable:\s+(\d+)\s+kB/);
            
            if (totalMatch) {
                const totalBytes = parseInt(totalMatch[1]) * 1024;
                const availBytes = availMatch ? parseInt(availMatch[1]) * 1024 : 0;
                const usedBytes = totalBytes - availBytes;
                
                return {
                    total: totalBytes,
                    used: usedBytes,
                    free: availBytes
                };
            }
        }
    } catch (error) {}

    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    return {
        total: totalBytes,
        used: totalBytes - freeBytes,
        free: freeBytes
    };
};

const getNodeMemory = () => {
    const heapStats = v8.getHeapStatistics();
    return {
        heapUsed: heapStats.used_heap_size,
        heapTotal: heapStats.heap_size_limit,
        heapPercent: ((heapStats.used_heap_size / heapStats.heap_size_limit) * 100).toFixed(1)
    };
};

const getConnectionStats = (conn) => {
  try {
    const chats = conn?.chats || global.conn?.chats || {};
    const allChats = Object.keys(chats);
    
    const grupos = allChats.filter(jid => jid.endsWith('@g.us')).length;
    const privados = allChats.filter(jid => jid.endsWith('@s.whatsapp.net')).length;
    const total = allChats.length;
    
    return { grupos, privados, total };
  } catch (e) {
    return { grupos: 0, privados: 0, total: 0 };
  }
};

const getStartTime = () => {
  const timestampConnect = global.timestamp?.connect?.getTime();
  const timestampStart = global.timestamp?.start?.getTime();
  const processStart = Date.now() - (process.uptime() * 1000);
  
  return timestampConnect || timestampStart || processStart;
};

const analyzePerformance = (download, upload, ping, systemInfo) => {
    const issues = [];
    const downloadMbps = download / 1000000;
    const uploadMbps = upload / 1000000;
    
    if (downloadMbps < 5) {
        issues.push('⚠️ Velocidad de descarga muy baja (< 5 Mbps)');
    }
    if (uploadMbps < 2) {
        issues.push('⚠️ Velocidad de subida muy baja (< 2 Mbps)');
    }
    if (ping > 100) {
        issues.push('⚠️ Latencia alta (> 100ms)');
    }
    if (parseFloat(systemInfo.memPercent) > 85) {
        issues.push('⚠️ Memoria RAM crítica (> 85%)');
    }
    if (parseFloat(systemInfo.heapPercent) > 80) {
        issues.push('⚠️ Heap de Node.js alto (> 80%)');
    }
    if (systemInfo.cpuLoad / systemInfo.cpuCount > 0.8) {
        issues.push('⚠️ CPU sobrecargada');
    }
    
    let diagnosis = '✅ *Estado: ÓPTIMO*\n';
    if (issues.length > 0) {
        diagnosis = '⚠️ *Estado: PROBLEMAS DETECTADOS*\n\n';
        diagnosis += issues.join('\n') + '\n\n';
        
        if (downloadMbps < 5 || uploadMbps < 2 || ping > 100) {
            diagnosis += '📡 *Causa probable:* Problema de conexión a Internet\n';
            diagnosis += '💡 *Solución:* Verifica tu proveedor de internet o reinicia el router\n';
        } else if (parseFloat(systemInfo.memPercent) > 85 || parseFloat(systemInfo.heapPercent) > 80) {
            diagnosis += '🖥️ *Causa probable:* Recursos del servidor saturados\n';
            diagnosis += '💡 *Solución:* El sistema se reiniciará automáticamente si es necesario\n';
        } else if (systemInfo.cpuLoad / systemInfo.cpuCount > 0.8) {
            diagnosis += '⚙️ *Causa probable:* CPU sobrecargada\n';
            diagnosis += '💡 *Solución:* Reduce procesos activos o espera unos minutos\n';
        }
    }
    
    return diagnosis;
};

const handler = async (m, { conn }) => {
    const loadingMsg = await m.reply('⏳ *Analizando servidor y red...*\n\nEsto puede tomar unos segundos.');
    
    try {
        const startTime = Date.now();
        
        const memInfo = await getRealMemory();
        const nodeMemInfo = getNodeMemory();
        const memPercent = ((memInfo.used / memInfo.total) * 100).toFixed(1);
        const cpuLoad = os.loadavg()[0].toFixed(2);
        const cpuCount = os.cpus().length;
        const stats = getConnectionStats(conn);
        const platform = os.platform();
        const nodeVersion = process.version;
        
        const botStartTime = getStartTime();
        const currentTime = Date.now();
        const uptime = currentTime - botStartTime;
        
        const fechaInicio = new Date(botStartTime);
        const formatoFecha = (fecha) => {
            return fecha.toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        
        const systemInfo = {
            memPercent,
            heapPercent: nodeMemInfo.heapPercent,
            cpuLoad,
            cpuCount
        };
        
        const { stdout, stderr } = await exec('python3 ./src/libraries/ookla-speedtest.py --secure --share', {
            timeout: 60000
        });
        
        const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const output = stdout || stderr;
        
        if (!output.trim()) {
            throw new Error('No se recibió respuesta del test de velocidad');
        }
        
        const downloadMatch = output.match(/\*Descarga:\*\s*([0-9.]+)\s*(Mbit\/s|Kbit\/s|Gbit\/s|Mbps|Kbps|Gbps)/i) ||
                             output.match(/Download[:\s]+([0-9.]+)\s*(Mbit\/s|Kbit\/s|Gbit\/s|Mbps|Kbps|Gbps)/i) ||
                             output.match(/DOWNLOAD.*?([0-9.]+)\s*(Mbit\/s|Kbit\/s|Gbit\/s|Mbps|Kbps|Gbps)/i);
        const uploadMatch = output.match(/\*Subida:\*\s*([0-9.]+)\s*(Mbit\/s|Kbit\/s|Gbit\/s|Mbps|Kbps|Gbps)/i) ||
                           output.match(/Upload[:\s]+([0-9.]+)\s*(Mbit\/s|Kbit\/s|Gbit\/s|Mbps|Kbps|Gbps)/i) ||
                           output.match(/UPLOAD.*?([0-9.]+)\s*(Mbit\/s|Kbit\/s|Gbit\/s|Mbps|Kbps|Gbps)/i);
        const pingMatch = output.match(/\*Latencia:\*\s*([0-9.]+)\s*ms/i) ||
                         output.match(/Ping[:\s]+([0-9.]+)\s*ms/i) || 
                         output.match(/Latency[:\s]+([0-9.]+)\s*ms/i);
        const imageMatch = output.match(/http[^"\s]+\.png/);
        
        const convertToBps = (value, unit) => {
            if (!unit) return value * 1000000;
            const u = unit.toLowerCase();
            if (u.includes('gbit') || u.includes('gbps')) return value * 1000000000;
            if (u.includes('mbit') || u.includes('mbps')) return value * 1000000;
            if (u.includes('kbit') || u.includes('kbps')) return value * 1000;
            return value * 1000000;
        };
        
        const download = downloadMatch ? convertToBps(parseFloat(downloadMatch[1]), downloadMatch[2]) : 0;
        const upload = uploadMatch ? convertToBps(parseFloat(uploadMatch[1]), uploadMatch[2]) : 0;
        const ping = pingMatch ? parseFloat(pingMatch[1]) : 0;
        const imageUrl = imageMatch ? imageMatch[0] : null;
        
        const diagnosis = analyzePerformance(download, upload, ping, systemInfo);
        
        const getStatusEmoji = () => {
            const memPct = parseFloat(memPercent);
            const heapPct = parseFloat(nodeMemInfo.heapPercent);
            
            if (memPct > 90 || heapPct > 90) return '🔴';
            if (memPct > 75 || heapPct > 75) return '🟡';
            return '🟢';
        };
        
        let message = `╭━━━〔 *ANÁLISIS COMPLETO* 〕━━━╮\n\n`;
        message += `${getStatusEmoji()} *ESTADO GENERAL*\n`;
        message += `${diagnosis}\n`;
        
        message += `⏱️ *TIEMPO DE ACTIVIDAD*\n`;
        message += `├ 🚀 Iniciado: ${formatoFecha(fechaInicio)}\n`;
        message += `├ ⏳ Uptime: ${formatUptime(uptime)}\n`;
        message += `└ ⏱️ Test: ${executionTime}s\n\n`;
        
        message += `💬 *ESTADÍSTICAS DE CHATS*\n`;
        message += `├ 👥 Grupos: ${stats.grupos}\n`;
        message += `├ 👤 Privados: ${stats.privados}\n`;
        message += `└ 📊 Total: ${stats.total}\n\n`;
        
        message += `📊 *VELOCIDAD DE RED*\n`;
        message += `├ 📥 Descarga: ${formatSpeed(download)}\n`;
        message += `├ 📤 Subida: ${formatSpeed(upload)}\n`;
        message += `└ 📍 Ping: ${ping.toFixed(2)} ms\n\n`;
        
        message += `💾 *MEMORIA DEL SISTEMA*\n`;
        message += `├ 📦 RAM: ${formatBytes(memInfo.used)} / ${formatBytes(memInfo.total)}\n`;
        message += `├ 📈 Uso: ${memPercent}%\n`;
        message += `└ 🆓 Libre: ${formatBytes(memInfo.free)}\n\n`;
        
        message += `🧠 *MEMORIA NODE.JS*\n`;
        message += `├ 🔧 Heap: ${formatBytes(nodeMemInfo.heapUsed)} / ${formatBytes(nodeMemInfo.heapTotal)}\n`;
        message += `└ 📊 Uso: ${nodeMemInfo.heapPercent}%\n\n`;
        
        message += `⚙️ *RECURSOS DEL SERVIDOR*\n`;
        message += `├ 🖥️ CPU: ${cpuLoad} / ${cpuCount} cores\n`;
        message += `├ 🐧 Sistema: ${platform}\n`;
        message += `└ 📗 Node.js: ${nodeVersion}\n\n`;
        
        message += `╰━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        if (imageUrl) {
            await conn.sendMessage(m.chat, {
                image: { url: imageUrl },
                caption: message
            }, { quoted: m });
        } else {
            await m.reply(message);
        }
        
    } catch (e) {
        const memInfo = await getRealMemory();
        const nodeMemInfo = getNodeMemory();
        const memPercent = ((memInfo.used / memInfo.total) * 100).toFixed(1);
        const cpuLoad = os.loadavg()[0].toFixed(2);
        const cpuCount = os.cpus().length;
        const stats = getConnectionStats(conn);
        
        const botStartTime = getStartTime();
        const uptime = Date.now() - botStartTime;
        
        let errorMsg = `❌ *ERROR EN TEST DE VELOCIDAD*\n\n`;
        errorMsg += `📛 Error: ${e.message}\n\n`;
        
        errorMsg += `⏱️ *UPTIME DEL BOT*\n`;
        errorMsg += `└ ⏳ Activo: ${formatUptime(uptime)}\n\n`;
        
        errorMsg += `💬 *CHATS ACTIVOS*\n`;
        errorMsg += `└ 👥 Grupos: ${stats.grupos} | 👤 Privados: ${stats.privados}\n\n`;
        
        errorMsg += `🔍 *DIAGNÓSTICO DEL SISTEMA*\n`;
        errorMsg += `├ 💾 RAM: ${formatBytes(memInfo.used)} / ${formatBytes(memInfo.total)} (${memPercent}%)\n`;
        errorMsg += `├ 🧠 Heap: ${formatBytes(nodeMemInfo.heapUsed)} / ${formatBytes(nodeMemInfo.heapTotal)} (${nodeMemInfo.heapPercent}%)\n`;
        errorMsg += `└ ⚙️ CPU: ${cpuLoad} / ${cpuCount} cores\n\n`;
        
        if (e.message.includes('timeout')) {
            errorMsg += `⚠️ *Causa probable:* Conexión a Internet extremadamente lenta o inestable\n`;
            errorMsg += `💡 *Solución:* Verifica tu conexión y vuelve a intentar\n`;
        } else if (e.message.includes('ENOENT') || e.message.includes('python')) {
            errorMsg += `⚠️ *Causa probable:* Falta el script de speedtest\n`;
            errorMsg += `💡 *Solución:* Contacta al administrador\n`;
        } else if (parseFloat(memPercent) > 90) {
            errorMsg += `⚠️ *Causa probable:* Memoria RAM insuficiente\n`;
            errorMsg += `💡 *Solución:* El sistema se reiniciará automáticamente\n`;
        } else {
            errorMsg += `⚠️ *Causa probable:* Error desconocido en el servidor\n`;
            errorMsg += `💡 *Solución:* Intenta de nuevo o contacta al administrador\n`;
        }
        
        return m.reply(errorMsg);
    }
};

handler.help = ['speedtest'];
handler.tags = ['info'];
handler.command = /^(speedtest?|test?speed|velocidad)$/i;

export default handler;