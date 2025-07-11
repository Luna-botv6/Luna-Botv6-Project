(async () => {
  // Función para validar URLs de imagen
  const isUrl = (text) => {
    return text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(jpe?g|gif|png)/, 'gi'));
  };

  const tradutor = m._translate?.plugins?.sticker_sticker || {
    texto1: "Envía una imagen o video para crear un sticker.",
    texto2: "Usa así:",
    texto3: "Error creando sticker, intenta de nuevo."
  };

  if (['a', 'A'].includes(m.text?.charAt(0))) return;

  let stiker = false;

  try {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || q.mediaType || '';
    const metadata = { isAiSticker: true };

    if (/webp|image|video/g.test(mime)) {
      const img = await q.download?.();
      if (!img) throw `${tradutor.texto1} ${m.text}`;

      let out;
      try {
        stiker = await global.sticker(img, false, global.packname, global.author, ["✨"], metadata);
      } catch (e) {
        console.error(e);
      } finally {
        if (!stiker) {
          if (/webp/g.test(mime)) out = await global.webp2png(img);
          else if (/image/g.test(mime)) out = await global.uploadImage(img);
          else if (/video/g.test(mime)) out = await global.uploadFile(img);
          if (typeof out !== 'string') out = await global.uploadImage(img);
          stiker = await global.sticker(false, out, global.packname, global.author, ["✨"], metadata);
        }
      }
    } else if (args[0]) {
      if (isUrl(args[0])) {
        stiker = await global.sticker(false, args[0], global.packname, global.author, ["✨"], metadata);
      } else {
        return await sock.sendMessage(m.chat, { text: `${tradutor.texto2} ${m.text}` }, { quoted: m });
      }
    }
  } catch (e) {
    console.error(e);
    if (!stiker) stiker = e;
  } finally {
    if (stiker) {
      await sock.sendMessage(m.chat, { sticker: stiker }, { quoted: m });
    } else {
      await sock.sendMessage(m.chat, { text: `${tradutor.texto3} ${m.text}` }, { quoted: m });
    }
  }
})();
