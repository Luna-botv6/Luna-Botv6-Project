import fetch from 'node-fetch'; 
import fs from 'fs';

const handler = async (m, {conn}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.menu_audios;

  try {
    const pp = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/menuaudio.png';

    const str = `☁️✨  ───  🌙  ───  ✨☁️
     𓆩 𝐋 𝐔 𝐍 𝐀 - 𝐁 𝐎 𝐓 𓆪
☁️✨  ───  🌙  ───  ✨☁️

  ╭━━━━〔 🔊 〕━━━━╮
     ${tradutor.texto1}
  ╰━━━━〔 🎶 〕━━━━╯

  ⭐ 𝖧𝗈𝗅𝖺
  ⭐ 𝖰𝗎𝖾 𝗇𝗈
  ⭐ 𝖠 𝗇𝖺𝖽𝗂𝖾 𝗅𝖾 𝗂𝗆𝗉𝗈𝗋𝗍𝖺
  ⭐ 𝖠𝗋𝖺 𝖺𝗋𝖺
  ⭐ 𝖸𝖺𝗆𝖾𝗍𝖾
  ⭐ 𝖴𝗐𝖴
  ⭐ 𝖡𝖺𝗇̃𝖺𝗍𝖾
  ⭐ 𝖡𝖺𝗇𝖾𝖺𝖽𝗈
  ⭐ 𝖡𝖾𝖻𝗂𝗍𝗈 𝖿𝗂𝗎 𝖿𝗂𝗎
  ⭐ 𝖡𝗎𝖾𝗇𝗈𝗌 𝖽𝗂́𝖺𝗌
  ⭐ 𝖡𝗎𝖾𝗇𝖺𝗌 𝗍𝖺𝗋𝖽𝖾𝗌
  ⭐ 𝖡𝗎𝖾𝗇𝖺𝗌 𝗇𝗈𝖼𝗁𝖾𝗌
  ⭐ 𝖲𝖾𝗑𝗈
  ⭐ 𝖦𝖾𝗆𝗂𝖽𝗈𝗌
  ⭐ 𝖧𝖾𝗇𝗍𝖺𝗂
  ⭐ 𝖥𝗂𝖾𝗌𝗍𝖺 𝖠𝖽𝗆𝗂𝗇
  ⭐ 𝖲𝗂𝗎𝗎𝗎
  ⭐ 𝖦𝖺𝗍𝗂𝗍𝗈
  ⭐ 𝖥𝗋𝖾𝖾 𝖿𝗂𝗋𝖾
  ⭐ 𝖯𝖺𝗌𝖺 𝗉𝖺𝖼𝗄
  ⭐ 𝖫𝖺 𝖻𝖾𝖻𝖾𝗌𝗂𝗍𝖺
  ⭐ 𝟧 𝗇𝗈𝖼𝗁𝖾𝗌
  ⭐ 𝖯𝗈𝗋 𝖿𝗂𝗇 𝖺𝗉𝖺𝗋𝖾𝖼𝗂𝗌𝗍𝖾

✨ ━━━━━ ☾ ━━━━━ ✨`;

    await conn.sendMessage(m.chat, {
      image: { url: pp },
      caption: str.trim()
    }, { quoted: m });

  } catch {
    conn.reply(m.chat, tradutor.texto2, m);
  }
};

handler.command = /^(menu2|audios|menú2|menuaudio|menuaudios)$/i;
export default handler;
