import v8 from 'v8';
import os from 'os';
import fs from 'fs';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getRealMemory = () => {
  try {
    if (fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes')) {
      const limit = fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim();
      const usage = fs.readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8').trim();
      const limitBytes = parseInt(limit);
      const usageBytes = parseInt(usage);
      
      if (limitBytes > 0 && limitBytes < 9007199254740991) {
        return {
          total: limitBytes,
          used: usageBytes
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
            used: usageBytes
          };
        }
      }
    }
  } catch (error) {}

  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  return {
    total: totalBytes,
    used: totalBytes - freeBytes
  };
};

const handler = async (m, { conn, text }) => {
  const heapStatsBefore = v8.getHeapStatistics();
  const memBefore = getRealMemory();
  const heapUsedBefore = heapStatsBefore.used_heap_size;
  const heapLimitBefore = heapStatsBefore.heap_size_limit;
  const memPercentBefore = ((memBefore.used / memBefore.total) * 100).toFixed(1);
  const heapPercentBefore = ((heapUsedBefore / heapLimitBefore) * 100).toFixed(1);

  const level = parseInt(text) || 1;
  
  if (level < 1 || level > 5) {
    return m.reply(`❌ *Nivel inválido*

Uso: *.ramtest <nivel>*

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

    statusMsg += `\n\n💡 *Nota:* La memoria se liberará automáticamente por el GC`;

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