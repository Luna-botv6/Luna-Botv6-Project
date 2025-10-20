import { readFile } from 'fs/promises';

export async function before(m, {conn, isOwner, isROwner}) {
  if (m.isBaileys && m.fromMe) return true;
  if (m.isGroup) return false;
  if (!m.message) return true;
  
  let ownerConfig = {};
  try {
    const configData = await readFile('./database/funciones-owner.json', 'utf8');
    ownerConfig = JSON.parse(configData);
  } catch (e) {
    console.error('Error leyendo funciones-owner.json:', e.message);
    return false;
  }
  
  if (!ownerConfig.antiprivado) return false;
  
  if (isOwner || isROwner) return false;
  
  const senderNumber = m.sender.split('@')[0];
  const ownerNumbers = global.owner.map(([num]) => num);
  const lidOwners = global.lidOwners || [];
  
  if (ownerNumbers.includes(senderNumber) || lidOwners.includes(senderNumber)) {
    return false;
  }
  
  let mensajeBloqueo = '🚫 *MODO ANTIPRIVADO ACTIVO*\n\n⚠️ Este bot no acepta mensajes privados.\n\n💡 Contacta al owner en grupos.';
  
  try {
    const user = global.db?.data?.users?.[m.sender];
    const idioma = user?.language || global.defaultLenguaje || 'es';
    const translateData = await readFile(`./src/languages/${idioma}.json`, 'utf8');
    const _translate = JSON.parse(translateData);
    mensajeBloqueo = _translate.plugins?._antiprivado?.texto1 || mensajeBloqueo;
  } catch (e) {
    console.error('Error cargando traducción antiprivado:', e.message);
  }
  
  try {
    await m.reply(mensajeBloqueo, false, {mentions: [m.sender]});
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.updateBlockStatus(m.chat, 'block');
    console.log(`🚫 Usuario bloqueado por antiprivado: ${senderNumber}`);
  } catch (error) {
    console.error('Error en antiprivado:', error.message);
  }
  
  return false;
}