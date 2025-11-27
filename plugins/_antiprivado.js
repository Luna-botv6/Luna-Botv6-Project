import { readFile } from 'fs/promises';

export async function before(m, { conn, isOwner, isROwner }) {
  if (m.isBaileys && m.fromMe) return true;
  if (m.isGroup) return false;
  if (!m.message) return true;

  let ownerConfig = {};
  try {
    const configData = await readFile('./database/funciones-owner.json', 'utf8');
    ownerConfig = JSON.parse(configData);
  } catch {
    ownerConfig.antiprivado = false;
  }

  if (!ownerConfig.antiprivado) return false;
  if (isOwner || isROwner) return false;

  const senderNumber = m.sender.split('@')[0];
  const ownerNumbers = global.owner.map(([num]) => num);
  const lidOwners = global.lidOwners || [];

  if (ownerNumbers.includes(senderNumber) || lidOwners.includes(senderNumber)) return false;

  const botJid = conn.user.jid || conn.user.id;
  if (m.sender === botJid) return true;

  if (typeof this.updateBlockStatus === 'function') {
    await this.updateBlockStatus(m.chat, 'block');
  }

  return true;
}
