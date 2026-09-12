// - Código desarrollado por: GabrielVz <@glytglobal>

import fetch from 'node-fetch';

let handler = async (m, { text, conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.buscador_npmjs || {};
  if (!text) return m.reply(t.sin_titulo || '〔 ❀ 〕INGRESA EL *TITULO* DE UN *MODULO* O *COMPLEMENTO* DE LA PLATAFORMA *NPMJS*');
  let res = await fetch(`http://registry.npmjs.com/-/v1/search?text=${text}`);
  let { objects } = await res.json();
  if (!objects.length) return m.reply(t.sin_resultados || '〔 ❀ 〕NO SE HAN ENCONTRADO *RESULTADOS* PARA SU *BUSQUEDA* EN LA PLATAFORMA DE *NPMJS*');
  let npmpp = 'https://unitedcamps.in/Images/IMG_1742157594.jpg';
  let npmtext = objects.map(({ package: pkg }) => {
    return `❀ ${t.titulo || 'Titulo'}: *${pkg.name}*\n❀ ${t.version || 'Versión'}: *${pkg.version || (t.sin_info || 'Sin Información')}*\n❀ ${t.info || 'Información'}: *${pkg.description || (t.sin_info || 'Sin Información')}*\n❀ ${t.enlace || 'Enlace'}: *${pkg.links.npm || (t.sin_info || 'Sin Información')}*\n\n─────────────────`;
  }).join`\n\n`;

  conn.sendMessage(m.chat, { image: { url: npmpp }, caption: npmtext }, { quoted: m });
};
handler.help = ['npmjs'];
handler.tags = ['search'];
handler.command = /^npmjs?$/i;

export default handler;
