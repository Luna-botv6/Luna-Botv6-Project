import { execSync } from 'child_process';

const handler = async (m, { conn, text }) => {

  try {
    const stdout = execSync('git pull' + (m.fromMe && text ? ' ' + text : ''));
    let messager = stdout.toString();

    if (messager.includes('Already up to date.')) messager = '✓ El repositorio ya está actualizado.';
    if (messager.includes('Updating')) messager = '✓ Archivos actualizados correctamente:\n\n' + stdout.toString();

    conn.reply(m.chat, messager, m);

  } catch {

    try {
      const status = execSync('git status --porcelain');

      if (status.length > 0) {
        const conflictedFiles = status
          .toString()
          .split('\n')
          .filter(line => line.trim() !== '')
          .map(line => {
            if (
              line.includes('.npm/') ||
              line.includes('.cache/') ||
              line.includes('tmp/') ||
              line.includes('MysticSession/') ||
              line.includes('npm-debug.log')
            ) {
              return null;
            }
            return '*→ ' + line.slice(3) + '*';
          })
          .filter(Boolean);

        if (conflictedFiles.length > 0) {
          const errorMessage = `⚠ Se detectaron archivos en conflicto:\n\n${conflictedFiles.join('\n')}.`;
          await conn.reply(m.chat, errorMessage, m);
        }
      }

    } catch (error) {
      console.error(error);
      let errorMessage2 = '❌ Ocurrió un error durante la actualización.';
      if (error.message) {
        errorMessage2 += '\n*- Mensaje de error:* ' + error.message;
      }
      await conn.reply(m.chat, errorMessage2, m);
    }
  }
};

handler.help = ['update'];
handler.tags = ['owner'];
handler.command = /^(update|actualizar|gitpull)$/i;
handler.rowner = true;
export default handler;
