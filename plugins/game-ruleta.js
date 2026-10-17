import { addExp, addMoney, getExp, getMoney, spendExp, spendMoney, removeExp, removeMoney } from '../lib/stats.js';

const userCommandHistory = {};
const userWarnings = {};
const userCooldowns = {};

const handler = async (m, { conn, usedPrefix, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.game_ruleta || {};
  const id = m.sender;
  const currentTime = Date.now();
  const cooldown = 120000; // 2 minutos

  // 🕒 Verificar cooldown de 2 minutos
  if (!userCooldowns[id]) userCooldowns[id] = 0;
  if (currentTime - userCooldowns[id] < cooldown) {
    const tiempoRestante = ((cooldown - (currentTime - userCooldowns[id])) / 1000).toFixed(0);
    return m.reply((t.cooldown?.replace('{tiempoRestante}', tiempoRestante)) || `⏳ Debes esperar *${tiempoRestante} segundos* antes de volver a jugar.`);
  }

  if (!userCommandHistory[id]) userCommandHistory[id] = [];
  if (!userWarnings[id]) userWarnings[id] = { count: 0, lastWarning: 0 };

  // Limpiar historial de comandos viejos (10s)
  userCommandHistory[id] = userCommandHistory[id].filter(ts => currentTime - ts < 10000);

  if (currentTime - userWarnings[id].lastWarning > 30000) {
    userWarnings[id].count = 0;
  }

  const commandCount = userCommandHistory[id].length;

  if (commandCount >= 3 && userWarnings[id].count === 0) {
    userWarnings[id].count = 1;
    userWarnings[id].lastWarning = currentTime;
    return m.reply((t.primera_advertencia?.replace('{commandCount}', commandCount)) || `⚠️ *PRIMERA ADVERTENCIA* ⚠️

Estás usando el comando de ruleta muy rápido.
*Has usado ${commandCount} comandos en los últimos 10 segundos.*

🚨 Si usas el comando 5 veces en 10 segundos:
💸 Perderás el 45% de tus Diamantes
⭐ Perderás el 45% de tu EXP`);
  }

  if (commandCount >= 4 && userWarnings[id].count === 1) {
    userWarnings[id].count = 2;
    userWarnings[id].lastWarning = currentTime;

    const saldoExp = await getExp(id);
    const saldoMoney = await getMoney(id);
    const posibleMultaExp = Math.floor(saldoExp * 0.45);
    const posibleMultaMoney = Math.floor(saldoMoney * 0.45);

    return m.reply((t.ultima_advertencia?.replace('{commandCount}', commandCount).replace('{posibleMultaExp}', posibleMultaExp).replace('{posibleMultaMoney}', posibleMultaMoney)) || `🔥 *ÚLTIMA ADVERTENCIA* 🔥

*¡PELIGRO!* Has usado ${commandCount} comandos en 10 segundos.
*¡SOLO FALTA 1 COMANDO MÁS PARA LA MULTA!*

⭐ EXP: ${posibleMultaExp} / 💎 Diamantes: ${posibleMultaMoney}

🛑 *¡PARA AHORA!* Espera unos segundos antes de continuar.`);
  }

  if (commandCount >= 5) {
    const saldoExp = await getExp(id);
    const saldoMoney = await getMoney(id);
    const multaExp = Math.floor(saldoExp * 0.45);
    const multaMoney = Math.floor(saldoMoney * 0.45);

    if (multaExp > 0) await removeExp(id, multaExp);
    if (multaMoney > 0) await removeMoney(id, multaMoney);

    userCommandHistory[id] = [];
    userWarnings[id] = { count: 0, lastWarning: 0 };

    return m.reply((t.multa_spam?.replace('{multaExp}', multaExp).replace('{multaMoney}', multaMoney)) || `🚫 *MULTA POR SPAM APLICADA* 🚫

💸 EXP perdido: ${multaExp}
💎 Diamantes perdidos: ${multaMoney}

⏰ Espera entre comandos para evitar sanciones.`);
  }

  userCommandHistory[id].push(currentTime);

  if (args.length < 3) {
    const message = (t.bienvenida?.replace(/\{usedPrefix\}/g, usedPrefix)) || `🎰 *¡Bienvenido a la Ruleta de Colores!* 🎰
Apuesta usando EXP o Diamantes:

🟢 Verde (x5) — Difícil, alta recompensa  
🔴 Rojo (x3) — Media probabilidad  
⚪ Blanco (x2) — Alta probabilidad

Ejemplo:  
${usedPrefix}ruleta exp rojo 50  
${usedPrefix}ruleta money verde 100`;

    const botones = [
      [(t.btn_exp_verde || '🟢 Exp Verde 300'), `${usedPrefix}ruleta exp verde 300`],
      [(t.btn_money_rojo || '🔴 Diamantes Rojo 50'), `${usedPrefix}ruleta money rojo 50`],
      [(t.btn_exp_blanco || '⚪ Exp Blanco 250'), `${usedPrefix}ruleta exp blanco 250`]
    ];

    await conn.sendButton(m.chat, message, global.BotName, null, botones, null, null, m);
    return;
  }

  const tipo = args[0].toLowerCase();
  const color = args[1]?.toLowerCase();
  const cantidad = parseInt(args[2]);

  if (!['exp', 'money'].includes(tipo)) return m.reply(t.tipo_invalido || '❌ Apuesta "exp" o "money".');
  if (!['verde', 'rojo', 'blanco'].includes(color)) return m.reply(t.color_invalido || '❌ Colores válidos: verde, rojo o blanco.');
  if (isNaN(cantidad) || cantidad < 1) return m.reply(t.cantidad_invalida || '❌ Ingresa una cantidad válida mayor a 0.');

  const saldoExp = await getExp(id);
  const saldoMoney = await getMoney(id);

  if (tipo === 'exp' && saldoExp < cantidad) return m.reply(t.sin_exp || '❌ No tienes suficiente *Exp*.');
  if (tipo === 'money' && saldoMoney < cantidad) return m.reply(t.sin_money || '❌ No tienes suficientes *Diamantes*.');

  const colores = ['verde', 'rojo', 'blanco', 'rojo', 'blanco', 'rojo', 'blanco', 'rojo', 'blanco', 'rojo'];
  const resultado = colores[Math.floor(Math.random() * colores.length)];

  const emojiColor = { verde: '🟢', rojo: '🔴', blanco: '⚪' };
  const multiColor = { verde: 5, rojo: 3, blanco: 2 };
  const nombreColor = {
    verde: t.color_verde || 'Verde',
    rojo: t.color_rojo || 'Rojo',
    blanco: t.color_blanco || 'Blanco'
  };
  const moneda = tipo === 'exp' ? 'Exp' : 'Diamantes';
  const monedaEmoji = tipo === 'exp' ? '⭐' : '💎';
  const gano = color === resultado;
  let ganancia = 0;
  let saldoFinal = 0;

  if (gano) {
    ganancia = cantidad * multiColor[resultado];
    if (tipo === 'exp') {
      addExp(id, ganancia);
      spendExp(id, cantidad);
      saldoFinal = getExp(id);
    } else {
      addMoney(id, ganancia);
      spendMoney(id, cantidad);
      saldoFinal = getMoney(id);
    }
  } else {
    if (tipo === 'exp') {
      spendExp(id, cantidad);
      saldoFinal = getExp(id);
    } else {
      spendMoney(id, cantidad);
      saldoFinal = getMoney(id);
    }
  }

  userCooldowns[id] = Date.now();

  const nf = (n) => Number(n || 0).toLocaleString();
  const titulo = t.titulo || '🎡  *R U L E T A*  🎡';
  const linea = t.linea || '━━━━━━━━━━━━━━━━━━';
  const frame = (emo, sp, estado) => `${titulo}\n${linea}\n\n        ${emo}\n      ${sp} ${estado}`;

  const cardTexto = (gano
    ? (t.card_ganaste || `${titulo}\n${linea}\n\n        {emoji}\n\n  *¡SALIÓ {color}!*  (x{multi})\n🎯 Elegiste: {tuEmoji} {tuColor}\n\n🎉 *¡GANASTE!*\n{monedaEmoji} *+{ganancia}* {moneda}\n\n💰 Saldo: *{saldo}* {monedaEmoji}`)
    : (t.card_perdiste || `${titulo}\n${linea}\n\n        {emoji}\n\n  *¡SALIÓ {color}!*  (x{multi})\n🎯 Elegiste: {tuEmoji} {tuColor}\n\n😢 *Perdiste*\n{monedaEmoji} *-{cantidad}* {moneda}\n\n💰 Saldo: *{saldo}* {monedaEmoji}`))
    .replace(/\{emoji\}/g, emojiColor[resultado])
    .replace(/\{color\}/g, nombreColor[resultado].toUpperCase())
    .replace(/\{multi\}/g, multiColor[resultado])
    .replace(/\{tuEmoji\}/g, emojiColor[color])
    .replace(/\{tuColor\}/g, nombreColor[color])
    .replace(/\{ganancia\}/g, nf(ganancia))
    .replace(/\{cantidad\}/g, nf(cantidad))
    .replace(/\{monedaEmoji\}/g, monedaEmoji)
    .replace(/\{moneda\}/g, moneda)
    .replace(/\{saldo\}/g, nf(saldoFinal));

  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const girando = t.spin_girando || 'girando...';
  const frenando = t.spin_frenando || 'frenando...';
  const secuencia = ['🔴', '⚪', '🟢', '🔴', '⚪', '🔴', '⚪', '🟢'];
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  try {
    const msg = await conn.sendMessage(m.chat, { text: frame(secuencia[0], spinner[0], girando) });
    let i = 1;
    let espera = 200;
    for (; i < secuencia.length; i++) {
      await sleep(espera);
      espera += 45;
      await conn.sendMessage(m.chat, { text: frame(secuencia[i], spinner[i % spinner.length], girando), edit: msg.key });
    }
    await sleep(espera + 120);
    await conn.sendMessage(m.chat, { text: frame(emojiColor[resultado], spinner[i % spinner.length], frenando), edit: msg.key });
    await sleep(600);
    await conn.sendMessage(m.chat, { text: cardTexto, edit: msg.key });
  } catch {
    return m.reply(cardTexto);
  }
};

handler.command = /^ruleta$/i;
export default handler;
