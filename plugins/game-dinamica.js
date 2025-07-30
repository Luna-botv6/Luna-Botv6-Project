const handler = async (m, { conn, args, command, isAdmin, isOwner }) => {
  const chatId = m.chat;
  global.dinamicas = global.dinamicas || {};

  const texto = (m.body || m.text || '').trim().toLowerCase();
  const isCerrar = command === 'cerrardinamica';
  const isAbrirIndividual = command === 'abrirdinamica';
  const isAbrirEquipo = command === 'abrirdinamica2';

  // Cerrar dinámica
  if (isCerrar) {
    if (!(isAdmin || isOwner)) {
      global.dfail('admin', m, conn);
      return;
    }
    if (global.dinamicas[chatId]) {
      delete global.dinamicas[chatId];
      return m.reply('🔒 Dinámica cerrada y reiniciada.');
    } else {
      return m.reply('❌ No hay dinámica activa.');
    }
  }

  // Abrir dinámica individual o por equipo
  if (isAbrirIndividual || isAbrirEquipo) {
    if (!(isAdmin || isOwner)) {
      global.dfail('admin', m, conn);
      return;
    }

    const max = Math.min(parseInt(args[0]) || 4, 50);
    const plantilla = args.slice(1).join(' ');
    if (!plantilla) return m.reply('❗ Debes incluir un mensaje base después del número.\n\nEjemplo:\n/abrirdinamica 4 Texto de la dinámica...');

    global.dinamicas[chatId] = {
      max,
      participantes: [], // Para equipo: {id, equipo}, para individual: id
      plantilla,
      activo: true,
      tipo: isAbrirEquipo ? 'equipo' : 'individual',
    };

    return m.reply(`✅ Dinámica activada para *${max}* personas. Participa respondiendo ${isAbrirEquipo ? '*/yo [equipo]*' : '*/yo*'}.\n\nEjemplo para equipo: /yo naranja`);
  }

  const dinamica = global.dinamicas[chatId];
  if (!dinamica?.activo) return;

  // Participación dinámica individual
  if (dinamica.tipo === 'individual') {
    if (texto !== '/yo') return;

    const tag = '@' + m.sender.split('@')[0];
    if (dinamica.participantes.includes(tag)) return;
    if (dinamica.participantes.length >= dinamica.max) return m.reply('⚠️ La dinámica ya está llena.');

    dinamica.participantes.push(tag);

    let actualizado = dinamica.plantilla;
    const regex = /(🩸|🔫|🍊|🍇|🍑|4️⃣|\*️⃣)/g;
    let i = 0;
    actualizado = actualizado.replace(regex, match => {
      const t = dinamica.participantes[i];
      i++;
      return t ? `${match} ${t}` : match;
    });

    return conn.sendMessage(chatId, {
      text: actualizado,
      mentions: dinamica.participantes.map(u => u.replace('@', '') + '@s.whatsapp.net')
    });
  }

  // Participación dinámica por equipo
  if (dinamica.tipo === 'equipo') {
    const match = texto.match(/^\/yo\s+(\S+)$/); // <- ahora con slash
    if (!match) return;

    const equipo = match[1];
    if (!dinamica.plantilla.includes(equipo)) return;

    const espaciosTotales = (dinamica.plantilla.match(new RegExp(equipo, 'g')) || []).length;
    const anotados = dinamica.participantes.filter(p => p.equipo === equipo).length;

    if (anotados >= espaciosTotales) return m.reply(`⚠️ Ya están llenos todos los cupos para el equipo ${equipo}.`);
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

handler.command = /^(abrirdinamica|abrirdinamica2|cerrardinamica)$/i;
handler.group = true;
handler.admin = true;
export default handler;