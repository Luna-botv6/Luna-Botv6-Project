const handlerYo = async (m, { conn }) => {
  const chatId = m.chat;
  const texto = (m.body || m.text || '').trim().toLowerCase();
  global.dinamicas = global.dinamicas || {};

  const dinamica = global.dinamicas[chatId];
  if (!dinamica?.activo) return;

  const tag = '@' + m.sender.split('@')[0];

  if (dinamica.tipo === 'individual') {
    if (texto !== '/yo') return;

    if (dinamica.participantes.includes(tag)) return;
    if (dinamica.participantes.length >= dinamica.max) return m.reply('⚠️ La dinámica ya está llena.');

    dinamica.participantes.push(tag);

    let actualizado = dinamica.plantilla;
    const regex = /(🩸|🔫|🍊|🍇|🍑|4️⃣|\*️⃣)/g;
    let i = 0;
    actualizado = actualizado.replace(regex, match => {
      const t = dinamica.participantes[i++];
      return t ? `${match} ${t}` : match;
    });

    return conn.sendMessage(chatId, {
      text: actualizado,
      mentions: dinamica.participantes.map(u => u.replace('@', '') + '@s.whatsapp.net')
    });
  }

  if (dinamica.tipo === 'equipo') {
    const match = texto.match(/^\/yo\s+(\S+)$/);
    if (!match) return;

    const equipo = match[1];
    if (!dinamica.plantilla.includes(equipo)) return;

    const espaciosTotales = (dinamica.plantilla.match(new RegExp(equipo, 'g')) || []).length;
    const anotados = dinamica.participantes.filter(p => p.equipo === equipo).length;

    if (anotados >= espaciosTotales) return m.reply(`⚠️ Ya están llenos los cupos para el equipo ${equipo}.`);
    if (dinamica.participantes.some(p => p.id === m.sender)) return;

    dinamica.participantes.push({ id: m.sender, equipo });

    let actualizado = dinamica.plantilla;
    for (const p of dinamica.participantes) {
      const regexEquipo = new RegExp(`^${p.equipo}\\s*$`, 'm');
      actualizado = actualizado.replace(regexEquipo, `${p.equipo} @${p.id.split('@')[0]}`);
    }

    return conn.sendMessage(chatId, {
      text: actualizado,
      mentions: dinamica.participantes.map(p => p.id)
    });
  }
};

handlerYo.command = /^yo$/i; // Detecta "/yo" o "!yo", según prefijo
handlerYo.group = true;
export default handlerYo;