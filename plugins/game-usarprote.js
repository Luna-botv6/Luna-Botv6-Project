import { getUserStats, setUserStats, getArmorStats, hasArmor } from '../lib/stats.js';
import { activarProteccion, tieneProteccion } from '../lib/usarprote.js';

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.game_usarprote || {};
  const userId = m.sender;

  if (tieneProteccion(userId).activa) {
    const _stats = getUserStats(userId)
    const _armor = getArmorStats(userId)
    const _tieneArmadura = hasArmor(userId)
    const _prote = tieneProteccion(userId)
    const _restante = _prote.expira ? Math.max(0, _prote.expira - Date.now()) : 0
    const _min = Math.ceil(_restante / 60000)
    return conn.sendMessage(m.chat, {
      text:
        (t.ya_activa?.replace('{min}', _min) || `⚠️ Ya tienes protección activa (${_min} min restantes).

`) +
        `❤️ HP: *${_stats.hp || 0}/${_stats.maxHp || 100}*
` +
        `🛡️ ${t.armadura_label || 'Armadura'}: *${_tieneArmadura ? `${_armor.type} (${_armor.durability}/${_armor.maxDurability})` : (t.sin_armadura || 'Sin armadura')}*
` +
        `🚨 ${t.bounty_label || 'Bounty'}: *${_stats.bountyStars ? '⭐'.repeat(_stats.bountyStars) : '—'}*`
    }, { quoted: m })
  }

  const userStats = getUserStats(userId);

  if ((userStats.mysticcoins ?? 0) === 0) {
    userStats.mysticcoins = 5;
    setUserStats(userId, userStats);
    await conn.sendMessage(m.chat, { text: t.regalo || '🎁 ¡Felicidades! Se te han regalado 5 mysticcoins para que puedas activar la protección.' }, { quoted: m });
  }

  const duracionesValidas = ['5', '12', '24'];

  if (args[0] && !duracionesValidas.includes(String(args[0]))) {
    return conn.sendMessage(m.chat, {
      text: t.arg_invalido || '❌ Argumento inválido. Usa: /usarprote [5|12|24]'
    }, { quoted: m });
  }

  // Por defecto 2 horas si no se pasa argumento válido
  const horas = args[0] ? String(args[0]) : '2';

  await activarProteccion(m, conn, horas);
};

handler.help = ['usarprote'];
handler.tags = ['econ'];
handler.command = /^(usarprote|usarproteccion|proteccion)$/i;

export default handler;