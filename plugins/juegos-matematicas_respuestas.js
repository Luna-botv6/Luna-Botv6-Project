global.math = global.math ? global.math : {};
global.mathCooldowns = global.mathCooldowns ? global.mathCooldowns : {};

const COOLDOWN_TIME = 3000;
const MAX_ATTEMPTS_PER_MINUTE = 10;
const MESSAGE_DELAY = 1500;

const handler = async (m, { conn }) => {
  try {
    const datas = global;
    const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    const tradutor = _translate.plugins.juegos_matematicas_respuestas;
    const id = m.chat;
    const userId = m.sender;

    if (!m.quoted) return;
    if (!/jrU022n8Vf/i.test(m.quoted.text)) return;

    const now = Date.now();
    
    if (!global.mathCooldowns[userId]) {
      global.mathCooldowns[userId] = { attempts: [], lastMessage: 0 };
    }

    const userCooldown = global.mathCooldowns[userId];
    userCooldown.attempts = userCooldown.attempts.filter(time => now - time < 60000);

    if (userCooldown.attempts.length >= MAX_ATTEMPTS_PER_MINUTE) {
      return;
    }

    if (now - userCooldown.lastMessage < COOLDOWN_TIME) {
      return;
    }

    if (!(id in global.math)) {
      await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY));
      return conn.reply(m.chat, `${tradutor.texto1}`, m);
    }

    if (m.quoted.id !== global.math[id][0].id) return;

    userCooldown.attempts.push(now);
    userCooldown.lastMessage = now;

    const math = global.math[id][1];
    const userAnswer = m.text.trim();

    await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY));

    if (userAnswer == math.result) {
      await conn.reply(m.chat, `${tradutor.texto2} ${math.bonus} XP`, m);
      
      global.db.data.users[userId].exp += math.bonus;
      
      if (global.math[id][3]) {
        clearTimeout(global.math[id][3]);
      }
      delete global.math[id];
      
    } else {
      if (--global.math[id][2] <= 0) {
        await conn.reply(m.chat, `${tradutor.texto3} ${math.result}`, m);
        
        if (global.math[id][3]) {
          clearTimeout(global.math[id][3]);
        }
        delete global.math[id];
        
      } else {
        await conn.reply(m.chat, `${tradutor.texto4} ${global.math[id][2]} ${tradutor.texto5}`, m);
      }
    }

    setTimeout(() => {
      if (global.mathCooldowns[userId]) {
        global.mathCooldowns[userId].attempts = 
          global.mathCooldowns[userId].attempts.filter(time => now - time < 60000);
      }
    }, 60000);

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
handler.command = new RegExp;

export default handler;
