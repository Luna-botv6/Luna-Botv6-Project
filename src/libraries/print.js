import chalk from 'chalk';

export default async function printMessage(m, conn = { user: {} }) {
  try {
    if (!m || !m.fromMe) return;

    const chat = m.chat || m.key?.remoteJid || '';
    if (!chat) return;

    const time = new Date(
      (m.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000
    ).toLocaleTimeString('es-ES');

    const botNumber = conn.user?.jid?.split('@')[0] || 'Bot';
    const chatNumber = chat.split('@')[0];

    let msgType =
      m.mtype?.replace(/message$/i, '') ||
      Object.keys(m.msg || {})[0] ||
      'Texto';

    let text =
      m.text ||
      m.msg?.conversation ||
      m.msg?.extendedTextMessage?.text ||
      m.msg?.imageMessage?.caption ||
      m.msg?.videoMessage?.caption ||
      '';

    console.log(chalk.bold.cyanBright('╭⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╮'));
    console.log('');
    console.log(
      chalk.bold.cyanBright('⎨') +
        chalk.bold.magentaBright('            ✧°ˆ Luna-BotV6 ˆ°✧         ')
    );
    console.log('');
    console.log(
      chalk.cyanBright('⎨') +
        ` ${chalk.redBright('🤖 Bot:')} ${botNumber}`
    );
    console.log('');
    console.log(
      chalk.cyanBright('⎨') +
        ` ${chalk.yellow('⏰ Hora:')} ${chalk.yellow(time)}`
    );
    console.log('');
    console.log(
      chalk.cyanBright('⎨') +
        ` ${chalk.green('📋 Tipo:')} ${chalk.green(msgType)}`
    );
    console.log('');
    console.log(
      chalk.cyanBright('⎨') +
        ` ${chalk.yellow('📥 En:')} ${chalk.yellow(chatNumber)}`
    );
    console.log('');
    console.log(
      chalk.cyanBright('⎨') +
        ` ${chalk.cyan('💬 Msg:')} ${chalk.cyan(msgType)}`
    );
    console.log(chalk.bold.cyanBright('╰⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╯'));

    if (text) {
      let out = text.replace(/\u200e+/g, '');

      if (out.length > 400) {
        out = out.substring(0, 400) + '\n' + chalk.blue('...truncado...');
      }

      console.log(chalk.yellow(out));
    }

    if (/image/i.test(msgType)) console.log(chalk.green('📷 Imagen'));
    else if (/sticker/i.test(msgType)) console.log(chalk.magenta('🧩 Sticker'));
    else if (/audio/i.test(msgType)) console.log(chalk.cyan('🎵 Audio'));
    else if (/document/i.test(msgType)) console.log(chalk.blue('📂 Documento'));
  } catch {}
}
