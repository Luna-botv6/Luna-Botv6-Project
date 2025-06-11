const handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!args[0]) {
    return conn.reply(m.chat, `*[!] Ingresa un enlace de Facebook para descargar el video.*\n\n*Ejemplo:*\n${usedPrefix + command} https://www.facebook.com/watch?v=123456789`, m);
  }

  if (!args[0].match(/facebook\.com|fb\.watch/)) {
    return conn.reply(m.chat, `*[!] El enlace no parece ser válido de Facebook.*\n\n*Ejemplo:*\n${usedPrefix + command} https://www.facebook.com/watch?v=123456789`, m);
  }

  const contenido = `✅ *VIDEO DE FACEBOOK*\n\nDescarga en progreso...`;
  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});

  try {
    // Llamada a la API de Neoxr
    const api = await fetch(`${global.neoxr.url}/fb?url=${args[0]}&apikey=${global.neoxr.key}`);
    const response = await api.json();
    if (response.status && Array.isArray(response.data)) {
      const videoHD = response.data.find(v => v.quality === 'HD')?.url;
      const videoSD = response.data.find(v => v.quality === 'SD')?.url;
      const videoUrl = videoHD || videoSD;
      if (videoUrl) {
        await conn.sendFile(m.chat, videoUrl, 'video.mp4', contenido, m);
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
        return;
      }
    }
  } catch (e) {
    console.log('Error con Neoxr API:', e);
  }

  // Si falla con Neoxr, probar con otra API
  try {
    const api = await fetch(`https://api.agatz.xyz/api/facebook?url=${args[0]}`);
    const data = await api.json();
    const videoUrl = data.data?.hd || data.data?.sd;
    const thumb = data.data?.thumbnail;
    if (videoUrl && videoUrl.endsWith('.mp4')) {
      await conn.sendFile(m.chat, videoUrl, 'video.mp4', contenido, m);
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
      return;
    } else if (thumb) {
      await conn.sendFile(m.chat, thumb, 'thumb.jpg', contenido, m);
    }
  } catch (e) {
    console.log('Error con Agatz API:', e);
  }

  // Otras opciones si ninguna API funciona
  try {
    const res = await fg.fbdl(args[0]);
    if (!res?.data?.length) {
      console.log('fg.fbdl: No se encontraron resultados');
      return conn.reply(m.chat, '❌ No se encontraron resultados con esa URL (fg.fbdl). Prueba otro enlace.', m);
    }
    const urll = res.data[0].url;
    await conn.sendFile(m.chat, urll, 'video.mp4', contenido, m);
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
    return;
  } catch (e) {
    console.log('Error final (fg.fbdl):', e);
  }
};

handler.command = /^(facebook|fb|facebookdl|fbdl)$/i;
handler.limit = 3;
export default handler;