import { readFile } from 'fs/promises';

export async function before(m, {conn, isOwner, isROwner}) {
  let ownerConfig = {};
  try {
    const configData = await readFile('./database/funciones-owner.json', 'utf8');
    ownerConfig = JSON.parse(configData);
  } catch (e) {
    console.error('Error leyendo funciones-owner.json:', e.message);
    return;
  }
  
  if (ownerConfig.modopublico) {
    global.opts['self'] = false;
  } else {
    global.opts['self'] = true;
  }
}