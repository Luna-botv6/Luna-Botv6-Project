import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { addExp, addMoney, getMoney, removeMoney } from '../lib/stats.js';

const EMOJIS = { X: '❌', O: '⭕', '': '⬜' };
const FILAS  = { a: 0, b: 1, c: 2 };

const renderBoard = (board) =>
  '```\n' +
  '   1  2  3\n' +
  'A  ' + board[0].map(v => EMOJIS[v]).join(' ') + '\n' +
  'B  ' + board[1].map(v => EMOJIS[v]).join(' ') + '\n' +
  'C  ' + board[2].map(v => EMOJIS[v]).join(' ') + '\n' +
  '```';

const emptyBoard = () => [['','',''],['','',''],['','','']];

const checkWin = (b, p) => {
  const lines = [
    [b[0][0],b[0][1],b[0][2]],
    [b[1][0],b[1][1],b[1][2]],
    [b[2][0],b[2][1],b[2][2]],
    [b[0][0],b[1][0],b[2][0]],
    [b[0][1],b[1][1],b[2][1]],
    [b[0][2],b[1][2],b[2][2]],
    [b[0][0],b[1][1],b[2][2]],
    [b[0][2],b[1][1],b[2][0]],
  ];
  return lines.some(l => l.every(c => c === p));
};

const isFull = (b) => b.flat().every(c => c);

const tag = (jid) => '@' + jid.split('@')[0];

const HELP = (p) =>
  '🌙 *Luna-Botv6-Project*\n\n' +
  '🎮 *Tic Tac Toe*\n\n' +
  '*Iniciar partida:*\n' +
  '_' + p + 'tictactoe @usuario_ — sin apuesta\n' +
  '_' + p + 'tictactoe @usuario 100_ — con apuesta 💎\n\n' +
  '*Hacer jugada:*\n' +
  '_' + p + 'ttt a1_  _' + p + 'ttt b3_  _' + p + 'ttt c2_\n\n' +
  '*Cancelar:*\n' +
  '_' + p + 'tictactoe cancelar_\n\n' +
  '*Tablero:*\n' +
  '```\n   1  2  3\nA  ⬜ ⬜ ⬜\nB  ⬜ ⬜ ⬜\nC  ⬜ ⬜ ⬜```\n' +
  '_Fila A/B/C + Columna 1/2/3 → a1, b2, c3..._\n\n' +
  '*Apuesta:* El ganador se lleva el doble en 💎';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  conn.tictactoe = conn.tictactoe || {};
  const id = m.chat;
  const p  = usedPrefix;

  if (!m.isGroup) return m.reply('🌙 *Luna-Botv6-Project*\n\n❌ Este juego solo funciona en grupos.');

  const { participants } = await getGroupDataForPlugin(conn, id, m.sender);

  const resolveParticipant = (jid) => {
    const num = (jid || '').replace(/[^0-9]/g, '');
    return participants.find(pp =>
      pp.id === jid || pp.lid === jid ||
      (pp.id  || '').replace(/[^0-9]/g, '') === num ||
      (pp.lid || '').replace(/[^0-9]/g, '') === num
    ) || null;
  };

  const resolveRealJid = (jid) => {
    if (!jid || !jid.includes('@lid')) return jid;
    const found = resolveParticipant(jid);
    return found?.id || jid;
  };

  const realSender = resolveRealJid(m.sender);
  const subCmd     = (args[0] || '').toLowerCase();
  const game       = conn.tictactoe[id];

  if (!subCmd || subCmd === 'ayuda') return m.reply(HELP(p));

  if (subCmd === 'cancelar') {
    if (!game) return m.reply('🌙 *Luna-Botv6-Project*\n\n❓ No hay ninguna partida activa.');
    if (realSender !== game.players[0] && realSender !== game.players[1])
      return m.reply('🌙 *Luna-Botv6-Project*\n\n❌ Solo los jugadores pueden cancelar.');
    if (game.bet > 0) {
      for (const pl of game.players) addMoney(pl, game.bet);
    }
    delete conn.tictactoe[id];
    return m.reply('🌙 *Luna-Botv6-Project*\n\n🚫 Partida cancelada. Las apuestas fueron devueltas.');
  }

  if (subCmd.match(/^[abc][1-3]$/)) {
    if (!game) return m.reply('🌙 *Luna-Botv6-Project*\n\n❓ No hay partida activa. Usá _' + p + 'tictactoe @usuario_');
    if (realSender !== game.players[game.turn]) {
      return conn.sendMessage(id, {
        text: '🌙 *Luna-Botv6-Project*\n\n⏳ Esperá tu turno ' + tag(m.sender) + ' 😅',
        mentions: [m.sender]
      }, { quoted: m });
    }

    const fila = FILAS[subCmd[0]];
    const col  = parseInt(subCmd[1]) - 1;

    if (game.board[fila][col]) {
      return conn.sendMessage(id, {
        text: '🌙 *Luna-Botv6-Project*\n\n❌ Esa casilla ya está ocupada ' + tag(m.sender) + '!\n\n' + renderBoard(game.board),
        mentions: [m.sender]
      }, { quoted: m });
    }

    const symbol = game.turn === 0 ? 'X' : 'O';
    game.board[fila][col] = symbol;

    if (checkWin(game.board, symbol)) {
      const ganador  = game.players[game.turn];
      const perdedor = game.players[1 - game.turn];
      const premio   = game.bet * 2;
      if (premio > 0) addMoney(ganador, premio);
      try { await addExp(ganador, 500); await addMoney(ganador, 150); } catch {}
      delete conn.tictactoe[id];
      return conn.sendMessage(id, {
        text:
          '🌙 *Luna-Botv6-Project*\n\n' +
          '🏆 *' + tag(ganador) + ' ganó el Tic Tac Toe!*\n\n' +
          renderBoard(game.board) + '\n' +
          (premio > 0 ? '💎 Premio: *' + premio + ' monedas*\n' : '') +
          '✨ +500 XP · +150 💎\n\n' +
          '😔 Mejor suerte la próxima ' + tag(perdedor) + '!',
        mentions: [ganador, perdedor]
      }, { quoted: m });
    }

    if (isFull(game.board)) {
      try { for (const pl of game.players) { await addExp(pl, 100); } } catch {}
      if (game.bet > 0) {
        for (const pl of game.players) addMoney(pl, game.bet);
      }
      delete conn.tictactoe[id];
      return conn.sendMessage(id, {
        text:
          '🌙 *Luna-Botv6-Project*\n\n' +
          '🤝 *Empate!*\n\n' +
          renderBoard(game.board) + '\n' +
          '✨ +100 XP para ambos · Las apuestas fueron devueltas',
        mentions: game.players
      }, { quoted: m });
    }

    game.turn = 1 - game.turn;
    const siguiente  = game.players[game.turn];
    const sigSimbolo = EMOJIS[game.turn === 0 ? 'X' : 'O'];

    return conn.sendMessage(id, {
      text:
        '🌙 *Luna-Botv6-Project*\n\n' +
        renderBoard(game.board) + '\n' +
        '🎯 Turno de ' + tag(siguiente) + ' ' + sigSimbolo + '\n' +
        '_Respondé con ' + p + 'ttt a1, b2, c3..._',
      mentions: [siguiente]
    }, { quoted: m });
  }

  if (!game) {
    const opponent     = m.mentionedJid?.[0];
    const realOpponent = resolveRealJid(opponent);
    const apuesta      = parseInt(args[1]) || 0;

    if (!opponent) return m.reply(HELP(p));
    if (opponent === m.sender) return m.reply('🌙 *Luna-Botv6-Project*\n\n❌ No podés jugar contra vos mismo 😅');
    if (!resolveParticipant(opponent)) return m.reply('🌙 *Luna-Botv6-Project*\n\n❌ Ese usuario no está en el grupo.');

    if (apuesta > 0) {
      const s1 = getMoney(realSender);
      const s2 = getMoney(realOpponent);
      if (s1 < apuesta) return m.reply('🌙 *Luna-Botv6-Project*\n\n❌ No tenés suficientes 💎 (tenés ' + s1 + ')');
      if (s2 < apuesta) return conn.sendMessage(id, {
        text: '🌙 *Luna-Botv6-Project*\n\n❌ ' + tag(opponent) + ' no tiene suficientes 💎 para apostar',
        mentions: [opponent]
      }, { quoted: m });
      removeMoney(realSender,   apuesta);
      removeMoney(realOpponent, apuesta);
    }

    conn.tictactoe[id] = {
      players: [realSender, realOpponent],
      board:   emptyBoard(),
      turn:    0,
      bet:     apuesta,
    };

    return conn.sendMessage(id, {
      text:
        '🌙 *Luna-Botv6-Project*\n\n' +
        '🎮 *Tic Tac Toe*\n\n' +
        tag(m.sender) + ' ❌  VS  ⭕ ' + tag(opponent) + '\n' +
        (apuesta > 0 ? '💎 Apuesta: *' + apuesta + ' monedas cada uno*\n' : '') +
        '\n' + renderBoard(emptyBoard()) + '\n' +
        '🎯 Empieza ' + tag(m.sender) + ' ❌\n' +
        '_Respondé con ' + p + 'ttt a1, b2, c3..._',
      mentions: [m.sender, opponent]
    }, { quoted: m });
  }

  return conn.sendMessage(id, {
    text:
      '🌙 *Luna-Botv6-Project*\n\n' +
      '⚠️ Ya hay una partida activa!\n\n' +
      renderBoard(game.board) + '\n' +
      '🎯 Turno de ' + tag(game.players[game.turn]) + ' ' + EMOJIS[game.turn === 0 ? 'X' : 'O'] + '\n' +
      '_Respondé con ' + p + 'ttt a1, b2, c3..._',
    mentions: [game.players[game.turn]]
  }, { quoted: m });
};

handler.help    = ['tictactoe', 'ttt'];
handler.tags    = ['juegos'];
handler.command = /^(tictactoe|ttt)$/i;
export default handler;