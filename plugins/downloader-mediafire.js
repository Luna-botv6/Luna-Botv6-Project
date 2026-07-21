import axios from 'axios';
import cheerio from 'cheerio';
import { lookup } from 'mime-types';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    throw `_*< DESCARGAS - MEDIAFIRE />*_\n\n*[ ℹ️ ] Ingresa un enlace de MediaFire.*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} http://www.mediafire.com/file/7a28wroqlhtfws7/archivo.jpeg`;
  }

  const url = args[0].trim();

  if (!/^https?:\/\/(www\.)?mediafire\.com\/file\//i.test(url)) {
    return m.reply('❌ *Ese no es un enlace válido de MediaFire.*\n\nDebe tener el formato:\nhttp://www.mediafire.com/file/xxxxx/nombre.ext');
  }

  let statusMsg;

  try {
    statusMsg = await conn.sendMessage(m.chat, { text: `🔎 *Buscando el enlace de descarga...*\n${barraProgreso(0)}` }, { quoted: m });

    const info = await mediafireDl(url);

    await editarEstado(conn, m, statusMsg, `📄 *${info.name}*\n📦 ${info.size}\n\n⬇️ *Iniciando descarga...*\n${barraProgreso(0)}`);

    let ultimoPorcentaje = 0;
    const buffer = await descargarArchivo(info.link, async (porcentaje) => {
      if (porcentaje - ultimoPorcentaje >= 10 || porcentaje === 100) {
        ultimoPorcentaje = porcentaje;
        await editarEstado(conn, m, statusMsg, `📄 *${info.name}*\n📦 ${info.size}\n\n⬇️ *Descargando...*\n${barraProgreso(porcentaje)}`);
      }
    });

    if (!buffer || buffer.length === 0) {
      throw new Error('El archivo descargado está vacío');
    }

    await editarEstado(conn, m, statusMsg, `📄 *${info.name}*\n📦 ${info.size}\n\n📤 *Enviando archivo...*\n${barraProgreso(100)}`);

    const caption = `*✅ DESCARGA COMPLETA - MEDIAFIRE*\n\n📄 *Nombre:* ${info.name}\n📦 *Tamaño:* ${info.size}\n🗓️ *Fecha:* ${info.date}\n🧬 *Tipo:* ${info.mime}`;

    await conn.sendFile(m.chat, buffer, info.name, caption, m, null, { mimetype: info.mime, asDocument: true });

    await editarEstado(conn, m, statusMsg, `✅ *${info.name}* enviado correctamente.\n${barraProgreso(100)}`);

  } catch (error) {
    const textoError = `❌ *No se pudo procesar el enlace de MediaFire.*\n\n🧾 *Detalle:* ${error.message}`;
    if (statusMsg) {
      await editarEstado(conn, m, statusMsg, textoError);
    } else {
      await m.reply(textoError);
    }
  }
};

function barraProgreso(porcentaje) {
  const totalBloques = 10;
  const llenos = Math.round((porcentaje / 100) * totalBloques);
  const vacios = totalBloques - llenos;
  return `🟩`.repeat(llenos) + `⬜`.repeat(vacios) + ` ${porcentaje}%`;
}

async function editarEstado(conn, m, statusMsg, texto) {
  try {
    await conn.sendMessage(m.chat, { text: texto, edit: statusMsg.key });
  } catch (error) {
    await m.reply(texto);
  }
}

handler.command = /^(mediafire|mediafiredl|dlmediafire)$/i;
export default handler;

async function mediafireDl(url) {
  let res;
  let $;
  let link = null;

  try {
    res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      timeout: 20000
    });
    $ = cheerio.load(res.data);
    link = extraerLink($, res.data);
  } catch (directError) {
    const translateUrl = `https://www-mediafire-com.translate.goog/${url.replace('https://www.mediafire.com/', '').replace('http://www.mediafire.com/', '')}?_x_tr_sl=en&_x_tr_tl=es&_x_tr_hl=es&_x_tr_pto=wapp`;
    res = await axios.get(translateUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      timeout: 20000
    });
    $ = cheerio.load(res.data);
    link = extraerLink($, res.data);
  }

  if (!link || link.includes('javascript:void(0)')) {
    throw new Error('No se pudo encontrar el enlace de descarga válido en la página');
  }

  if (!link.startsWith('http')) {
    throw new Error('El enlace de descarga extraído no es válido');
  }

  const name = extraerNombre($);
  const date = extraerFecha($);
  const size = extraerTamano($);

  const ext = name.split('.').pop()?.toLowerCase();
  const mime = lookup(ext) || 'application/octet-stream';

  return { name, size, date, mime, link };
}

function extraerLink($, html) {
  const downloadButton = $('#downloadButton');
  let link = downloadButton.attr('href');

  if (link && !link.includes('javascript:void(0)')) return link;

  link = downloadButton.attr('data-href') || downloadButton.attr('data-url') || downloadButton.attr('data-link');
  if (link && !link.includes('javascript:void(0)')) return link;

  const scrambledUrl = downloadButton.attr('data-scrambled-url');
  if (scrambledUrl) {
    try {
      link = Buffer.from(scrambledUrl, 'base64').toString('utf-8');
      if (link && link.startsWith('http')) return link;
    } catch (e) {}
  }

  const linkMatch = html.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/);
  if (linkMatch) return linkMatch[1];

  const altMatch = html.match(/"(https:\/\/[^"]*mediafire[^"]*\.(zip|rar|pdf|jpg|jpeg|png|gif|mp4|mp3|exe|apk|txt|doc|docx|pptx|xlsx)[^"]*)"/i);
  if (altMatch) return altMatch[1];

  return null;
}

function extraerNombre($) {
  return (
    $('body > main > div.content > div.center > div > div.dl-btn-cont > div.dl-btn-labelWrap > div.promoDownloadName.notranslate > div').attr('title')?.replace(/\s+/g, ' ')?.trim() ||
    $('.dl-btn-label').attr('title')?.trim() ||
    $('.filename').text().trim() ||
    'archivo_descargado'
  );
}

function extraerFecha($) {
  return (
    $('body > main > div.content > div.center > div > div.dl-info > ul > li:nth-child(2) > span').text().trim() ||
    $('.details li:nth-child(2) span').text().trim() ||
    'Fecha no disponible'
  );
}

function extraerTamano($) {
  return (
    $('#downloadButton').text().replace('Download', '').replace(/[()]/g, '').replace(/\n/g, '').replace(/\s+/g, ' ').trim() ||
    $('.details li:first-child span').text().trim() ||
    'Tamaño no disponible'
  );
}

async function descargarArchivo(link, onProgreso) {
  const response = await axios.get(link, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    timeout: 60000,
    maxContentLength: 200 * 1024 * 1024,
    maxBodyLength: 200 * 1024 * 1024,
    onDownloadProgress: (progressEvent) => {
      if (progressEvent.total && onProgreso) {
        const porcentaje = Math.floor((progressEvent.loaded / progressEvent.total) * 100);
        onProgreso(porcentaje);
      }
    }
  });
  return Buffer.from(response.data);
}