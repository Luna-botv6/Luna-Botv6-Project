import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const handler = async (m, { conn, isROwner, text }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.owner_restart;
  
  await m.reply(`
🔄 ${tradutor.texto1 || 'Reiniciando el bot...'}
⏳ El bot se reiniciará en unos segundos.
✅ Por favor espera un momento.
  `.trim());
  
  setTimeout(async () => {
    await conn.ws.close();
    
    const indexPath = path.join(process.cwd(), 'index.js');
    const args = [indexPath, ...process.argv.slice(2)];
    
    spawn(process.argv[0], args, {
      detached: true,
      stdio: 'inherit'
    }).unref();
    
    process.exit(0);
  }, 2000);
};

handler.help = ['restart'];
handler.tags = ['owner'];
handler.command = ['restart', 'reiniciar'];
handler.rowner = true;

export default handler;
