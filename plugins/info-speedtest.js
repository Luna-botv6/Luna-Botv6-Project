import cp from 'child_process';
import { promisify } from 'util';
import os from 'os';

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

const getSystemInfo = () => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
    const cpuLoad = os.loadavg()[0].toFixed(2);
    const cpuCount = os.cpus().length;
    
    return {
        memUsed: formatBytes(usedMem),
        memTotal: formatBytes(totalMem),
        memPercent,
        cpuLoad,
        cpuCount,
        platform: os.platform(),
        uptime: Math.floor(os.uptime() / 60)
    };
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
        } else if (parseFloat(systemInfo.memPercent) > 85 || systemInfo.cpuLoad / systemInfo.cpuCount > 0.8) {
            diagnosis += '🖥️ *Causa probable:* Recursos del servidor saturados\n';
            diagnosis += '💡 *Solución:* Reinicia el bot o contacta al administrador del nodo\n';
        }
    }
    
    return diagnosis;
};

const handler = async (m) => {
    const loadingMsg = await m.reply('⏳ *Realizando test de velocidad...*\n\nEsto puede tomar unos segundos.');
    
    try {
        const startTime = Date.now();
        const systemBefore = getSystemInfo();
        
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
        
        const systemAfter = getSystemInfo();
        const diagnosis = analyzePerformance(download, upload, ping, systemAfter);
        
        let message = `╭━『 *TEST DE VELOCIDAD* 』━╮\n\n`;
        message += `${diagnosis}\n`;
        message += `📊 *VELOCIDAD DE RED*\n`;
        message += `├ 📥 Descarga: ${formatSpeed(download)}\n`;
        message += `├ 📤 Subida: ${formatSpeed(upload)}\n`;
        message += `├ 🏓 Ping: ${ping.toFixed(2)} ms\n`;
        message += `└ ⏱️ Tiempo de test: ${executionTime}s\n\n`;
        
        message += `🖥️ *RECURSOS DEL SERVIDOR*\n`;
        message += `├ 💾 RAM: ${systemAfter.memUsed} / ${systemAfter.memTotal} (${systemAfter.memPercent}%)\n`;
        message += `├ ⚙️ CPU Load: ${systemAfter.cpuLoad} / ${systemAfter.cpuCount} cores\n`;
        message += `├ 🔧 Sistema: ${systemAfter.platform}\n`;
        message += `└ ⏰ Uptime: ${systemAfter.uptime} min\n\n`;
        
        message += `╰━━━━━━━━━━━━━━━━━╯`;
        
        if (imageUrl) {
            await conn.sendMessage(m.chat, {
                image: { url: imageUrl },
                caption: message
            }, { quoted: m });
        } else {
            await m.reply(message);
        }
        
    } catch (e) {
        const systemInfo = getSystemInfo();
        
        let errorMsg = `❌ *ERROR EN TEST DE VELOCIDAD*\n\n`;
        errorMsg += `📛 Error: ${e.message}\n\n`;
        
        errorMsg += `🔍 *DIAGNÓSTICO DEL SISTEMA*\n`;
        errorMsg += `├ 💾 RAM: ${systemInfo.memUsed} / ${systemInfo.memTotal} (${systemInfo.memPercent}%)\n`;
        errorMsg += `├ ⚙️ CPU: ${systemInfo.cpuLoad} / ${systemInfo.cpuCount} cores\n`;
        errorMsg += `└ ⏰ Uptime: ${systemInfo.uptime} min\n\n`;
        
        if (e.message.includes('timeout')) {
            errorMsg += `⚠️ *Causa probable:* Conexión a Internet extremadamente lenta o inestable\n`;
            errorMsg += `💡 *Solución:* Verifica tu conexión y vuelve a intentar\n`;
        } else if (e.message.includes('ENOENT') || e.message.includes('python')) {
            errorMsg += `⚠️ *Causa probable:* Falta el script de speedtest\n`;
            errorMsg += `💡 *Solución:* Contacta al administrador\n`;
        } else if (parseFloat(systemInfo.memPercent) > 90) {
            errorMsg += `⚠️ *Causa probable:* Memoria RAM insuficiente\n`;
            errorMsg += `💡 *Solución:* Reinicia el bot o el servidor\n`;
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