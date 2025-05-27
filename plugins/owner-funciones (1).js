import { getOwnerFunction, setOwnerFunction } from '../lib/owner-funciones.js';

const funcionesValidas = ['antiprivado', 'modogrupos', 'auread', 'modopublico', 'viewimage'];

const handler = async (m, { command, args, conn, usedPrefix }) => {
  const accion = command === 'onf' ? true : false;
  const funcion = args[0]?.toLowerCase();

  if (!funcion || !funcionesValidas.includes(funcion))
    throw `⚠️ Uso incorrecto.\n\nEjemplo:\n${usedPrefix + command} antiprivado\n\nFunciones válidas:\n${funcionesValidas.map(f => `• ${f}`).join('\n')}`;

  const éxito = setOwnerFunction(funcion, accion);

  if (!éxito) {
    await m.reply(`❌ No se pudo cambiar el estado de la función *${funcion}*.`);
    return;
  }

  await m.reply(`✅ La función *${funcion}* ha sido ${accion ? 'activada' : 'desactivada'} correctamente.`);
};

handler.help = ['onf <función>', 'offf <función>'];
handler.tags = ['owner'];
handler.command = /^onf|offf$/i;
handler.rowner = true;

export default handler;
