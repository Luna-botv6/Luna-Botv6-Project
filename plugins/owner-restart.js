const handler = async (m, { conn, isROwner, text }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.owner_restart;

  await m.reply(`
❌ ${tradutor.texto1}
⚠️ Actualmente no puedo reiniciar el bot desde aquí porque ya no tengo acceso a process.send.
✅ Por favor, reinícialo desde el panel web de Boxmine.
  `.trim());
};

handler.help = ['restart'];
handler.tags = ['owner'];
handler.command = ['restart', 'reiniciar'];
handler.rowner = true;
export default handler;
