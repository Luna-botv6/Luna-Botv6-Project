import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js';
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js';

try { verificarMenuIuman() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const SERVER_URL = obtenerMenuIuman();
const API_KEY = cargarOGenerarAPIKey();
const DL_HEADERS = { 'X-Client-Name': 'luna-bot-v6', 'X-API-Key': API_KEY };

const handler = async (m, {args, usedPrefix, command}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.herramientas__translate;

  const msg = `${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}\n*${usedPrefix + command} ${tradutor.texto1[2]}\n*- https://cloud.google.com/translate/docs/languages*`;
  if (!args || !args[0]) return m.reply(msg);
  let lang = args[0];
  let text = args.slice(1).join(' ');
  const defaultLang = 'es';
  if ((args[0] || '').length !== 2) {
    lang = defaultLang;
    text = args.join(' ');
  }
  if (!text && m.quoted && m.quoted.text) text = m.quoted.text;
  if (!text) return m.reply(msg);
  try {
    const res = await fetch(`${SERVER_URL}/api/translate?q=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`, { headers: DL_HEADERS });
    const data = await res.json();
    if (!data?.status) throw new Error(data?.error || 'Error');
    await m.reply(tradutor.texto3 + data.texto);
  } catch {
    await m.reply(tradutor.texto2);
  }
};
handler.command = /^(translate|traducir|trad)$/i;
export default handler;
