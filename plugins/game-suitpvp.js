const timeout = 60000; // 1 minuto para elegir
const poin = 500; // puntos por victoria
const poin_lose = -100; // puntos por derrota
const poin_bot = 200; // puntos extra si juegas contra el bot

const startHandler = async (m, { conn, usedPrefix, command }) => {
  conn.suit = conn.suit || {};

  if (!m.isGroup) return m.reply('⚠️ Este comando solo se puede usar en grupos para iniciar la partida.');

  const isChoice = ['piedra', 'papel', 'tijera'].includes(m.text.toLowerCase());
  if (isChoice) return; // No procesar respuestas aquí

  // Verificar si ya están jugando
  if (Object.values(conn.suit).find(room => room.id.startsWith('suit') && [room.p1, room.p2].includes(m.sender))) {
    return m.reply('⚠️ Ya estás en una partida activa. Termina antes de iniciar otra.');
  }

  if (!m.mentionedJid || !m.mentionedJid[0]) {
    return m.reply(`👥 *¿Con quién quieres jugar?* Menciona a un participante.\nEjemplo:\n${usedPrefix + command} @usuario`);
  }

  const opponent = m.mentionedJid[0];
  if (opponent === m.sender) return m.reply('⚠️ ¡No puedes jugar contra ti mismo!');
  if (Object.values(conn.suit).find(room => room.id.startsWith('suit') && [room.p1, room.p2].includes(opponent))) {
    return m.reply('⚠️ ¡El oponente ya está en otra partida!');
  }

  const id = 'suit_' + new Date() * 1;
  const room = {
    id,
    chat: m.chat,
    p1: m.sender,
    p2: opponent,
    status: 'wait',
    choice1: '',
    choice2: '',
    timeout: setTimeout(() => {
      if (conn.suit[id]) {
        conn.reply(m.chat, '⏳ La partida se canceló por inactividad.', m);
        delete conn.suit[id];
      }
    }, timeout),
    poin,
    poin_lose,
    poin_bot
  };
  conn.suit[id] = room;

  const startMsg = `🎮 *¡Nueva partida de Piedra, Papel o Tijera!*\n\n👤 *Jugador 1:* @${m.sender.split('@')[0]}\n👤 *Jugador 2:* @${opponent.split('@')[0]}\n\n💡 Ambos recibirán un mensaje privado para elegir su jugada.\n⏳ ¡Tienen 1 minuto para decidir!`;
  await conn.sendMessage(m.chat, { text: startMsg, mentions: [m.sender, opponent] });

  const privateMsg = `👋 ¡Hola! Responde con:\n🪨 piedra\n📄 papel\n✂️ tijera\n\n✅ Cuando los dos hayan elegido, anunciaré el ganador en el grupo.`;
  await conn.sendMessage(m.sender, { text: privateMsg });
  await conn.sendMessage(opponent, { text: privateMsg });
};

startHandler.command = /^pvp|suit(pvp)?$/i;
startHandler.group = true;
startHandler.private = false;
export default startHandler;



