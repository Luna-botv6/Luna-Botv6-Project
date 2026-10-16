import v8 from 'v8';
import os from 'os';
import fs from 'fs';
import { conteoActivos } from '../lib/funcion/subbot-manager.js';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const readFileSafe = (path) => {
  try {
    return fs.readFileSync(path, 'utf8');
  } catch {
    return '';
  }
};

const getContainerMemory = () => {
  const limitV2 = readFileSafe('/sys/fs/cgroup/memory.max').trim();
  const currentV2 = readFileSafe('/sys/fs/cgroup/memory.current').trim();
  const statV2 = readFileSafe('/sys/fs/cgroup/memory.stat');
  if (limitV2 && limitV2 !== 'max' && currentV2) {
    const totalBytes = parseInt(limitV2);
    const usedBytes = parseInt(currentV2);
    let anonBytes = 0;
    let fileBytes = 0;
    for (const line of statV2.split('\n')) {
      const [key, val] = line.trim().split(/\s+/);
      if (key === 'anon') anonBytes = parseInt(val) || 0;
      if (key === 'file') fileBytes = parseInt(val) || 0;
    }
    return { totalBytes, usedBytes, anonBytes, fileBytes };
  }

  const limitV1 = readFileSafe('/sys/fs/cgroup/memory/memory.limit_in_bytes').trim();
  const currentV1 = readFileSafe('/sys/fs/cgroup/memory/memory.usage_in_bytes').trim();
  const statV1 = readFileSafe('/sys/fs/cgroup/memory/memory.stat');
  if (limitV1 && currentV1) {
    const limitBytes = parseInt(limitV1);
    const usedBytes = parseInt(currentV1);
    if (limitBytes > 0 && limitBytes < 9007199254740991) {
      let anonBytes = 0;
      let fileBytes = 0;
      for (const line of statV1.split('\n')) {
        const match = line.trim().match(/^total_(rss|cache)\s+(\d+)/);
        if (match) {
          if (match[1] === 'rss') anonBytes = parseInt(match[2]) || 0;
          if (match[1] === 'cache') fileBytes = parseInt(match[2]) || 0;
        }
      }
      return { totalBytes: limitBytes, usedBytes, anonBytes, fileBytes };
    }
  }

  const totalBytes = os.totalmem();
  return { totalBytes, usedBytes: totalBytes - os.freemem(), anonBytes: 0, fileBytes: 0 };
};

const readProcessInfo = (pid) => {
  try {
    const statm = readFileSafe(`/proc/${pid}/statm`).split(' ');
    const stat = readFileSafe(`/proc/${pid}/stat`);
    const comm = readFileSafe(`/proc/${pid}/comm`).trim();
    if (!statm[1] || !stat || !comm) return null;
    const lastParen = stat.lastIndexOf(')');
    const fields = stat.slice(lastParen + 2).trim().split(' ');
    const cmd = readFileSafe(`/proc/${pid}/cmdline`).replace(/\0/g, ' ').trim();
    return {
      pid,
      ppid: parseInt(fields[1]) || 0,
      name: comm,
      cmd: cmd || comm,
      rssBytes: parseInt(statm[1]) * 4096
    };
  } catch {
    return null;
  }
};

const getAllProcesses = () => {
  try {
    const result = [];
    const pids = fs.readdirSync('/proc').filter((d) => /^\d+$/.test(d));
    for (const pid of pids) {
      const info = readProcessInfo(parseInt(pid));
      if (info) result.push(info);
    }
    return result;
  } catch {
    return [];
  }
};

const getRealMemory = () => {
  try {
    const limitV2 = readFileSafe('/sys/fs/cgroup/memory.max').trim();
    const currentV2 = readFileSafe('/sys/fs/cgroup/memory.current').trim();
    if (limitV2 && limitV2 !== 'max' && currentV2) {
      const limitBytes = parseInt(limitV2);
      const usageBytes = parseInt(currentV2);
      if (limitBytes > 0) {
        return { total: limitBytes, used: usageBytes };
      }
    }
  } catch {}

  try {
    const limitV1 = readFileSafe('/sys/fs/cgroup/memory/memory.limit_in_bytes').trim();
    const currentV1 = readFileSafe('/sys/fs/cgroup/memory/memory.usage_in_bytes').trim();
    if (limitV1 && currentV1) {
      const limitBytes = parseInt(limitV1);
      const usageBytes = parseInt(currentV1);
      if (limitBytes > 0 && limitBytes < 9007199254740991) {
        return { total: limitBytes, used: usageBytes };
      }
    }
  } catch {}

  const totalBytes = os.totalmem();
  return { total: totalBytes, used: totalBytes - os.freemem() };
};

const diagnosticar = async (m) => {
  const cont = getContainerMemory();
  const procs = getAllProcesses();
  const nodeProcs = procs.filter((p) => p.name === 'node');
  const nodeSum = nodeProcs.reduce((sum, p) => sum + p.rssBytes, 0);
  const top = [...procs].sort((a, b) => b.rssBytes - a.rssBytes).slice(0, 6);
  const restUsed = Math.max(0, cont.usedBytes - nodeSum);
  const own = process.memoryUsage();
  const heap = v8.getHeapStatistics();

  let msg = `🧠 *DIAGNÓSTICO DE RAM*\n\n`;

  msg += `📊 *Contenedor:*\n`;
  msg += `├ 💾 Total: ${formatBytes(cont.totalBytes)}\n`;
  msg += `├ 📈 Usado: ${formatBytes(cont.usedBytes)} (${((cont.usedBytes / cont.totalBytes) * 100).toFixed(1)}%)\n`;
  if (cont.anonBytes || cont.fileBytes) {
    msg += `├ 🧱 Anónimo (RAM real): ${formatBytes(cont.anonBytes)}\n`;
    msg += `└ 📁 Caché de archivos (liberable): ${formatBytes(cont.fileBytes)}\n`;
  }
  msg += `\n`;

  msg += `🛠 *Proceso actual:*\n`;
  msg += `├ 🧠 Heap: ${formatBytes(heap.used_heap_size)} / ${formatBytes(heap.heap_size_limit)} (${((heap.used_heap_size / heap.heap_size_limit) * 100).toFixed(1)}%)\n`;
  msg += `├ 📏 RSS (memoria real): ${formatBytes(own.rss)}\n`;
  msg += `├ 📦 External (buffers C++): ${formatBytes(own.external)}\n`;
  msg += `└ 🧾 ArrayBuffers: ${formatBytes(own.arrayBuffers || 0)}\n\n`;

  if (nodeProcs.length) {
    msg += `📦 *Procesos Node del contenedor: (${nodeProcs.length})*\n`;
    for (const p of nodeProcs) {
      msg += `├ PID ${p.pid} · ${formatBytes(p.rssBytes)} · ${p.cmd.slice(0, 80) || p.name}${p.pid === process.pid ? ' ← este' : ''}\n`;
    }
    msg += `└ Σ Node: ${formatBytes(nodeSum)} (${((nodeSum / cont.totalBytes) * 100).toFixed(1)}% del contenedor)\n\n`;
  } else {
    msg += `📦 *Procesos Node:* (sin lectura de /proc en este entorno)\n\n`;
  }

  if (procs.length) {
    msg += `🗂 *Top procesos por RAM:*\n`;
    top.forEach((p, i) => {
      msg += `├ ${i + 1} · ${formatBytes(p.rssBytes)} · ${p.cmd.slice(0, 60) || p.name}${p.pid === process.pid ? ' ← este' : ''}\n`;
    });
    msg += `└ Cantidad total de procesos: ${procs.length}\n\n`;
  }

  try {
    const subs = conteoActivos();
    msg += `🤖 *SubBots activos:* ${subs}\n\n`;
  } catch {}

  const contPct = (cont.usedBytes / cont.totalBytes) * 100;
  const botPct = (nodeSum / cont.totalBytes) * 100;
  const outsideHeap = own.rss - heap.used_heap_size;
  const restPct = (restUsed / cont.totalBytes) * 100;

  msg += `📉 *Análisis:*\n`;
  if (contPct >= 92) {
    msg += `🔴 *CRÍTICO*: contenedor al ${contPct.toFixed(1)}%. Presión total de RAM.\n`;
  } else if (botPct >= 85) {
    msg += `🟡 *ALTO*: el bot (Node) usa ${formatBytes(nodeSum)} = ${botPct.toFixed(1)}% del contenedor.\n`;
    if (outsideHeap > 200 * 1024 * 1024) {
      msg += `   Por fuera del heap hay ${formatBytes(outsideHeap)} (buffers de Baileys/media) — algo no suelta memoria.\n`;
    }
  } else if (restUsed >= cont.usedBytes * 0.5) {
    msg += `🟡 *ATENCIÓN*: ${formatBytes(restUsed)} (${restPct.toFixed(1)}%) NO es del bot — mirá el top de procesos (ffmpeg, python, otro bot).\n`;
  } else if (cont.fileBytes >= cont.usedBytes * 0.5) {
    msg += `🟢 *NORMAL*: la mayor parte del "usado" es caché de archivos (${formatBytes(cont.fileBytes)}), se libera solo bajo presión.\n`;
  } else {
    msg += `🟢 *NORMAL*: heap al ${((heap.used_heap_size / heap.heap_size_limit) * 100).toFixed(1)}% y consumo dentro de rango.\n`;
  }
  msg += `💡 Heap bajo ≠ RAM baja: lo que suele crecer es RSS/External (buffers sueltos), otros procesos o caché del contenedor.`;

  return m.reply(msg);
};

const handler = async (m, { conn, text }) => {
  const arg = (text || '').trim();

  if (!arg || ['diag', 'info', 'diagnostico'].includes(arg.toLowerCase())) {
    return diagnosticar(m);
  }

  const level = parseInt(arg);

  if (isNaN(level) || level < 1 || level > 5) {
    return m.reply(`❌ *Nivel inválido*

Uso: *.ramtest* → diagnóstico completo
     *.ramtest <nivel>* → test de estrés

Niveles disponibles:
├ *1* - Bajo (50 MB)
├ *2* - Medio (100 MB)
├ *3* - Alto (200 MB)
├ *4* - Crítico (400 MB)
└ *5* - Extremo (600 MB)

⚠️ *ADVERTENCIA:* Niveles 4-5 pueden forzar el reinicio automático del bot.`);
  }

  const sizes = {
    1: { mb: 50, desc: 'Bajo', warning: false },
    2: { mb: 100, desc: 'Medio', warning: false },
    3: { mb: 200, desc: 'Alto', warning: true },
    4: { mb: 400, desc: 'Crítico', warning: true },
    5: { mb: 600, desc: 'Extremo', warning: true }
  };

  const testConfig = sizes[level];

  const heapStatsBefore = v8.getHeapStatistics();
  const memBefore = getRealMemory();
  const heapUsedBefore = heapStatsBefore.used_heap_size;
  const heapLimitBefore = heapStatsBefore.heap_size_limit;
  const memPercentBefore = ((memBefore.used / memBefore.total) * 100).toFixed(1);
  const heapPercentBefore = ((heapUsedBefore / heapLimitBefore) * 100).toFixed(1);

  await m.reply(`🧪 *TEST DE ESTRÉS DE RAM - NIVEL ${level}*

📊 *Estado Inicial:*
├ 💾 RAM Sistema: ${formatBytes(memBefore.used)} / ${formatBytes(memBefore.total)} (${memPercentBefore}%)
├ 🧠 Heap Node.js: ${formatBytes(heapUsedBefore)} / ${formatBytes(heapLimitBefore)} (${heapPercentBefore}%)
└ 📈 Nivel: ${testConfig.desc}

${testConfig.warning ? '⚠️ *ADVERTENCIA:* Este nivel puede activar el reinicio automático del sistema.\n\n' : ''}🔄 Consumiendo ${testConfig.mb}MB de RAM...`);

  await new Promise(resolve => setTimeout(resolve, 2000));

  const arrays = [];
  const targetBytes = testConfig.mb * 1024 * 1024;
  const chunkSize = 1024 * 1024;
  let allocatedBytes = 0;

  try {
    const startTime = Date.now();

    while (allocatedBytes < targetBytes) {
      const buffer = new Array(chunkSize / 8).fill(Math.random().toString(36));
      arrays.push(buffer);
      allocatedBytes += chunkSize;

      if (allocatedBytes % (50 * 1024 * 1024) === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const consumptionTime = ((Date.now() - startTime) / 1000).toFixed(2);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const heapStatsAfter = v8.getHeapStatistics();
    const memAfter = getRealMemory();
    const heapUsedAfter = heapStatsAfter.used_heap_size;
    const heapLimitAfter = heapStatsAfter.heap_size_limit;
    const memPercentAfter = ((memAfter.used / memAfter.total) * 100).toFixed(1);
    const heapPercentAfter = ((heapUsedAfter / heapLimitAfter) * 100).toFixed(1);

    const ramIncreased = memAfter.used - memBefore.used;
    const heapIncreased = heapUsedAfter - heapUsedBefore;

    let statusMsg = `✅ *TEST COMPLETADO - NIVEL ${level}*

📊 *Resultados del Test:*
├ ⏱️ Tiempo: ${consumptionTime}s
├ 📦 RAM Consumida: ${formatBytes(ramIncreased)}
└ 🧠 Heap Consumido: ${formatBytes(heapIncreased)}

📈 *Estado Actual:*
├ 💾 RAM Sistema: ${formatBytes(memAfter.used)} / ${formatBytes(memAfter.total)} (${memPercentAfter}%)
└ 🧠 Heap Node.js: ${formatBytes(heapUsedAfter)} / ${formatBytes(heapLimitAfter)} (${heapPercentAfter}%)

🔍 *Análisis:*`;

    if (parseFloat(memPercentAfter) >= 92) {
      statusMsg += `\n🔴 *CRÍTICO* - RAM al ${memPercentAfter}%
⚠️ El sistema debería reiniciar automáticamente en segundos...`;
    } else if (parseFloat(memPercentAfter) >= 85) {
      statusMsg += `\n🟡 *ALTO* - RAM al ${memPercentAfter}%
⚠️ Cerca del límite de reinicio automático (92%)`;
    } else if (parseFloat(heapPercentAfter) >= 85) {
      statusMsg += `\n🟡 *HEAP ALTO* - Heap al ${heapPercentAfter}%
⚠️ Node.js está usando mucha memoria heap`;
    } else {
      statusMsg += `\n🟢 *NORMAL* - Sistema estable
✅ Recursos dentro de límites seguros`;
    }

    statusMsg += '\n\n💡 *Nota:* La memoria se liberará automáticamente por el GC';

    await m.reply(statusMsg);

    await new Promise(resolve => setTimeout(resolve, 3000));

    arrays.length = 0;

    if (global.gc) {
      global.gc();
      await m.reply('🧹 *Limpieza forzada ejecutada (GC)*');
    }

  } catch (e) {
    await m.reply(`❌ *Error durante el test:*\n\n${e.message}\n\n⚠️ Es posible que el sistema haya alcanzado el límite de memoria y esté reiniciando...`);
  }
};

handler.help = ['ramtest <nivel>'];
handler.tags = ['owner'];
handler.command = /^(ramtest|testram|stressram)$/i;
handler.rowner = true;

export default handler;