import fs from 'fs';
import path from 'path';

const LOGS_DIR = './logs_bans';

function ensureLogsDirectory() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function formatDateTime() {
  const now = new Date();
  const date = now.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  const time = now.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  return { date, time, timestamp: now.toISOString() };
}

function getRealJidAndTag(sender) {
  const realJid = sender.includes('@lid') ? sender.split('@')[0] : sender;
  const number = realJid.split('@')[0];
  const tag = `@${number}`;
  return { realJid, number, tag };
}

export function logSpamWarning(sender, data, comandos, context) {
  ensureLogsDirectory();
  
  const { date, time, timestamp } = formatDateTime();
  const { realJid, number, tag } = getRealJidAndTag(sender);
  
  const logEntry = `
${'='.repeat(80)}
ADVERTENCIA DE SPAM
${'='.repeat(80)}
Fecha: ${date}
Hora: ${time}
Timestamp: ${timestamp}

INFORMACIÓN DEL USUARIO:
  • Número: ${number}
  • Tag: ${tag}
  • JID Real: ${realJid}
  • JID Original: ${sender}

CONTEXTO:
  • Tipo: ${context.isGroup ? 'Grupo' : 'Chat Privado'}
  • Chat ID: ${context.chatId}
  ${context.isGroup ? `• Nombre del Grupo: ${context.groupName || 'N/A'}` : ''}

ESTADÍSTICAS:
  • Advertencia: ${data.warns}/${context.warningsLimit}
  • Comandos en intervalo: ${data.count}
  • Total de mensajes: ${data.totalMessages}
  • Intervalo: ${context.intervalSeconds} segundos
  
COMANDOS DETECTADOS:
${comandos.map((cmd, i) => `  ${i + 1}. ${cmd}`).join('\n')}

ACCIÓN: Advertencia enviada en el ${context.isGroup ? 'grupo' : 'chat privado'}
${'='.repeat(80)}

`;

  const filename = path.join(LOGS_DIR, `antispam_warnings_${date.replace(/\//g, '-')}.txt`);
  fs.appendFileSync(filename, logEntry, 'utf8');
}

export function logSpamBan(sender, data, comandos, context) {
  ensureLogsDirectory();
  
  const { date, time, timestamp } = formatDateTime();
  const { realJid, number, tag } = getRealJidAndTag(sender);
  
  const logEntry = `
${'='.repeat(80)}
BAN POR SPAM
${'='.repeat(80)}
Fecha: ${date}
Hora: ${time}
Timestamp: ${timestamp}

INFORMACIÓN DEL USUARIO:
  • Número: ${number}
  • Tag: ${tag}
  • JID Real: ${realJid}
  • JID Original: ${sender}

CONTEXTO:
  • Tipo: ${context.isGroup ? 'Grupo' : 'Chat Privado'}
  • Chat ID: ${context.chatId}
  ${context.isGroup ? `• Nombre del Grupo: ${context.groupName || 'N/A'}` : ''}

ESTADÍSTICAS FINALES:
  • Advertencias totales: ${data.warns}/${context.warningsLimit}
  • Comandos en último intervalo: ${data.count}
  • Total de mensajes detectados: ${data.totalMessages}
  • Tiempo de seguimiento: ${Math.floor((Date.now() - data.firstDetection) / 60000)} minutos

HISTORIAL DE COMANDOS USADOS:
${comandos.map((cmd, i) => `  ${i + 1}. ${cmd}`).join('\n')}

ACCIONES TOMADAS:
  ✓ Usuario bloqueado en WhatsApp
  ✓ Usuario baneado en la base de datos
  ✓ Mensaje de ban enviado en ${context.isGroup ? 'el grupo' : 'el chat privado'}
  ✓ Log registrado en logs_bans/

MOTIVO: Spam automático - Exceso de comandos
${'='.repeat(80)}

`;

  const filename = path.join(LOGS_DIR, `antispam_bans_${date.replace(/\//g, '-')}.txt`);
  fs.appendFileSync(filename, logEntry, 'utf8');
  
  const summaryFile = path.join(LOGS_DIR, 'bans_summary.txt');
  const summaryEntry = `[${date} ${time}] BAN: ${tag} (${number}) - ${context.isGroup ? 'Grupo' : 'Privado'} - ${data.warns} advertencias\n`;
  fs.appendFileSync(summaryFile, summaryEntry, 'utf8');
}

export function logOwnerSpam(sender, comandos, context) {
  ensureLogsDirectory();
  
  const { date, time } = formatDateTime();
  const { number, tag } = getRealJidAndTag(sender);
  
  const logEntry = `[${date} ${time}] OWNER SPAM: ${tag} - ${comandos.length} comandos en ${context.intervalSeconds}s\n`;
  
  const filename = path.join(LOGS_DIR, `owner_activity_${date.replace(/\//g, '-')}.txt`);
  fs.appendFileSync(filename, logEntry, 'utf8');
}