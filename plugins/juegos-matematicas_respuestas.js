import fs from 'fs';

global.math = global.math || {};
global.mathCooldowns = global.mathCooldowns || {};

const COOLDOWN_TIME = 3000;
const MAX_ATTEMPTS_PER_MINUTE = 10;
const MESSAGE_DELAY = 1500;

const handler = async (m, { conn }) => {
  try {
    const datas = global;
    const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;

    let tradutor = {
      texto1: 'No hay ningún juego activo en este chat.',
      texto2: 'Correcto, has ganado',
      texto3: 'Se acabaron los intentos. La respuesta correcta era',
      texto4: 'Respuesta incorrecta. Te quedan',
      texto5: 'intentos.'
    };

    try {
      const dataLang = fs.readFileSync(`./src/languages/${idioma}.json`, 'utf8');
      const parsed = JSON.parse(dataLang);
      if (parsed?.plugins?.juegos_matematicas_respuestas) {
        tradutor = parsed.plugins.juegos_matematicas_respuestas;
      }
    } catch (e) {}

    const id = m.chat;
    const userId = m.sender;

    if (!m.quoted) return;
    if (!m.quoted.text) return;
    if (!/jrU022n8Vf/i.test(m.quoted.text)) return;
    if (!(id in global.math)) return;

    const now = Date.now();

    if (!global.mathCooldowns[userId]) {
      global.mathCooldowns[userId] = { attempts: [], lastMessage: 0 };
    }

    const userCooldown = global.mathCooldowns[userId];
    userCooldown.attempts = userCooldown.attempts.filter((time) => now - time < 60000);

    if (userCooldown.attempts.length >= MAX_ATTEMPTS_PER_MINUTE) {
      return;
    }

    if (now - userCooldown.lastMessage < COOLDOWN_TIME) {
      return;
    }

    if (m.quoted.id !== global.math[id][0].id) return;

    userCooldown.attempts.push(now);
    userCooldown.lastMessage = now;

    const math = global.math[id][1];
    const userAnswer = m.text.trim();

    await new Promise((resolve) => setTimeout(resolve, MESSAGE_DELAY));

    if (userAnswer == math.result) {
      await conn.reply(m.chat, `${tradutor.texto2} ${math.bonus} XP`, m);

      if (global.db?.data?.users?.[userId]) {
        global.db.data.users[userId].exp = (global.db.data.users[userId].exp || 0) + math.bonus;
      }

      if (global.math[id][3]) {
        clearTimeout(global.math[id][3]);
      }
      delete global.math[id];
    } else {
      global.math[id][2] -= 1;

      if (global.math[id][2] <= 0) {
        await conn.reply(m.chat, `${tradutor.texto3} ${math.result}`, m);

        if (global.math[id][3]) {
          clearTimeout(global.math[id][3]);
        }
        delete global.math[id];
      } else {
        await conn.reply(
          m.chat,
          `${tradutor.texto4} ${global.math[id][2]} ${tradutor.texto5}`,
          m
        );
      }
    }

    setTimeout(() => {
      if (!global.mathCooldowns[userId]) return;
      global.mathCooldowns[userId].attempts = global.mathCooldowns[userId].attempts.filter(
        (time) => Date.now() - time < 60000
      );
    }, 65000);
  } catch (error) {
    console.error('[MATH PLUGIN ERROR]:', error);

    const id = m.chat;
    if (id in global.math) {
      if (global.math[id][3]) {
        clearTimeout(global.math[id][3]);
      }
      delete global.math[id];
    }
  }
};

handler.customPrefix = /^-?[0-9]+(\.[0-9]+)?$/;
handler.command = /^no-math-command$/i;

export default handler;
