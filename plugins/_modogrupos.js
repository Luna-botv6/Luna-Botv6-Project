import { readFile } from 'fs/promises';
import { watchFile } from 'fs';

let cachedConfig = null;
let lastConfigRead = 0;
const CONFIG_CACHE_TIME = 3000;

if (!global.modogruposWarnings) {
  global.modogruposWarnings = new Map();
}

watchFile('./database/funciones-owner.json', async () => {
  console.log('🔄 Modo grupos actualizado en tiempo real');
  cachedConfig = null;
});

async function getConfig() {
  const now = Date.now();
  if (cachedConfig && (now - lastConfigRead) < CONFIG_CACHE_TIME) {
    return cachedConfig;
  }
  
  try {
    const data = await readFile('./database/funciones-owner.json', 'utf8');
    cachedConfig = JSON.parse(data);
    lastConfigRead = now;
    return cachedConfig;
  } catch (e) {
    return { modogrupos: false };
  }
}

function normalizeOwners(list) {
  if (!list) return [];
  if (typeof list === 'string') return [list.replace(/\D/g, '')];
  if (Array.isArray(list)) {
    return list.flatMap(x => {
      if (Array.isArray(x)) return x[0] ? String(x[0]).replace(/\D/g, '') : '';
      return String(x).replace(/\D/g, '');
    }).filter(Boolean);
  }
  return [];
}

export async function before(m, { conn, isOwner, isROwner }) {
  try {
    if (m.fromMe) return false;
    if (m.messageStubType) return false;
    if (!m.sender) return false;
    if (!m.text || m.text.trim() === '') return false;
    
    const config = await getConfig();
    if (!config.modogrupos) return false;
    if (m.isGroup || m.chat.endsWith('@g.us')) return false;

    const sender = (m.sender || '').split('@')[0].replace(/\D/g, '');
    const allOwners = [
      ...normalizeOwners(global.owner),
      ...normalizeOwners(global.lidOwners),
      ...normalizeOwners(global.roots),
      ...normalizeOwners(global.ownerJid)
    ];
    if (isOwner || isROwner || allOwners.includes(sender)) return false;

    const userKey = `${sender}_${m.chat}`;
    let userData = global.modogruposWarnings.get(userKey);
    
    if (!userData) {
      userData = { warnings: 0, lastWarning: 0, blocked: false, lastMessageId: null };
      global.modogruposWarnings.set(userKey, userData);
    }

    if (userData.lastMessageId === m.key.id) {
      return true;
    }
    userData.lastMessageId = m.key.id;

    if (userData.blocked) {
      console.log(`🚫 Usuario bloqueado: ${sender}`);
      return true;
    }

    const now = Date.now();
    if ((now - userData.lastWarning) > 300000) {
      userData.warnings = 0;
    }

    if ((now - userData.lastWarning) < 2000) {
      return true;
    }

    userData.warnings++;
    userData.lastWarning = now;
    global.modogruposWarnings.set(userKey, userData);

    if (userData.warnings >= 3) {
      userData.blocked = true;
      
      setTimeout(async () => {
        try {
          await conn.sendMessage(m.chat, {
            text: '🚫 *Has sido bloqueado por insistir en usar el bot por privado.*\n\n_El bot solo funciona en grupos. Has recibido 3 advertencias._\n\n💬 *Contacta al owner si crees que es un error.*'
          }, { quoted: m });
          
          setTimeout(async () => {
            await conn.updateBlockStatus(m.sender, 'block').catch(() => {});
            console.log(`🚫 Usuario bloqueado: ${sender}`);
          }, 2000);
        } catch (e) {
          console.error('Error bloqueando:', e.message);
        }
      }, 500);
      
      return true;
    }

    const warnings = {
      1: '⚠️ *ADVERTENCIA 1/3*\n\n*El bot no responde chats privados.*\n\n🔹 Para usar el bot, agrégalo a un grupo.\n🔹 Si insistes, serás bloqueado después de 3 advertencias.',
      2: '⚠️ *ADVERTENCIA 2/3*\n\n*Segunda advertencia: El bot NO funciona en privado.*\n\n🔹 Agrégame a un grupo para usarme.\n🔸 *Una advertencia más y serás bloqueado.*'
    };

    if (warnings[userData.warnings]) {
      setTimeout(async () => {
        try {
          await conn.sendMessage(m.chat, { 
            text: warnings[userData.warnings] 
          }, { quoted: m });
        } catch (e) {
          console.error('Error enviando advertencia:', e.message);
        }
      }, 500);
    }

    console.log(`⚠️ Advertencia ${userData.warnings}/3 a ${sender}`);
    
    if (global.modogruposWarnings.size > 500) {
      const entries = Array.from(global.modogruposWarnings.entries());
      entries.sort((a, b) => a[1].lastWarning - b[1].lastWarning);
      for (let i = 0; i < 250; i++) {
        global.modogruposWarnings.delete(entries[i][0]);
      }
    }

    return true;

  } catch (e) {
    console.error('❌ Error en modogrupos:', e.message);
    return false;
  }
}