import { watchFile, unwatchFile } from 'fs';
import { isFunctionEnabled } from '../lib/owner-funciones.js';
import { getOwnerNumbers } from '../lib/funcion/system-owners.js';

if (!global.__modogruposBlock) global.__modogruposBlock = new Set();

let fileWatcher = null;
function startWatcher() {
  if (fileWatcher) unwatchFile('./database/funciones-owner.json', fileWatcher);
  fileWatcher = () => { global.__modogruposBlock.clear(); };
  watchFile('./database/funciones-owner.json', fileWatcher);
}
startWatcher();

export const isGlobalBefore = true;

export async function before(m, { conn, isOwner, isROwner }) {
  try {
    if (m.fromMe) return false;
    if (m.messageStubType) return false;
    if (!m.sender) return false;

    const botJid = conn.user?.jid || conn.user?.id;
    if (m.sender === botJid) return false;

    if (!isFunctionEnabled('modogrupos')) {
      global.__modogruposBlock.delete(m.chat);
      return false;
    }

    const isGroup = m.isGroup || (m.chat && m.chat.endsWith('@g.us'));
    if (isGroup) {
      global.__modogruposBlock.delete(m.chat);
      return false;
    }

    const sender = (m.sender || '').split('@')[0].replace(/\D/g, '');
    const allOwners = getOwnerNumbers();
    const isAnyOwner = isOwner || isROwner || (sender && allOwners.includes(sender));

    if (isAnyOwner) {
      global.__modogruposBlock.delete(m.chat);
      return false;
    }

    global.__modogruposBlock.add(m.chat);
    m.text = '';
    m.commandSinPrefijo = '';
    m.isMentionedBot = false;
    return true;

  } catch {
    return false;
  }
}
