import fs from 'fs';
import path from 'path';
import { customCommandsStore } from './custom-commands-store.js';

function escapeForTemplate(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

function armarCodigoFuente(commandName, sesion) {
  const { message, tagUser, tagAll, needsImage, imagePath, imageName } = sesion;
  const mentionsExpr = tagAll ? 'participants.map(p => p.id)' : tagUser ? '[m.sender]' : '[]';

  let code = 'import fs from \'fs\'\n\n';
  code += `const handler = async (m, { conn, participants }) => {
  let responseText = \`${escapeForTemplate(message)}\`\n`;
  if (tagUser) code += '  responseText = "@" + m.sender.split("@")[0] + "\\n" + responseText\n';
  if (tagAll) {
    code += '  let mentions = participants.map(p => p.id)\n';
    code += '  responseText = mentions.map(v => "@" + v.split("@")[0]).join(" ") + "\\n" + responseText\n';
  }
  if (needsImage && imagePath) {
    code += `  const imagePath = './codeimagenes/${imageName}'\n`;
    code += `  if (fs.existsSync(imagePath)) {
    const imageBuffer = fs.readFileSync(imagePath)
    await conn.sendMessage(m.chat, { image: imageBuffer, caption: responseText, mentions: ${mentionsExpr} }, { quoted: m })
  } else {
    m.reply(responseText, null, { mentions: ${mentionsExpr} })
  }`;
  } else {
    code += `  m.reply(responseText, null, { mentions: ${mentionsExpr} })`;
  }
  code += `\n}\n\nhandler.help = ['${commandName}']\nhandler.tags = ['custom']\nhandler.command = /^${commandName}$/i\nexport default handler`;
  return code;
}

function nombreColisiona(nombre) {
  const nombreLower = nombre.toLowerCase();
  const plugins = global.plugins || {};
  for (const key in plugins) {
    if (key.startsWith('custom-commands/')) continue;
    const plugin = plugins[key];
    const cmd = plugin?.command;
    if (!cmd) continue;
    if (Array.isArray(cmd)) {
      if (cmd.some((c) => String(c).toLowerCase() === nombreLower)) return key;
    } else if (cmd instanceof RegExp) {
      if (cmd.test(nombre)) return key;
    }
  }
  return null;
}

async function generarOActualizarComando(commandName, sesion) {
  const code = armarCodigoFuente(commandName, sesion);
  const customDir = './custom-commands';
  if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true });
  const fileName = `${commandName}.js`;
  const filePath = `./custom-commands/${fileName}`;
  fs.writeFileSync(filePath, code);

  delete global.plugins[`custom-commands/${fileName}`];
  const fullPath = path.resolve(filePath);
  const module = await import(`file://${fullPath}?t=${Date.now()}`);
  global.plugins[`custom-commands/${fileName}`] = module.default || module;
  if (global.customCommandsCache) {
    global.customCommandsCache.set(fileName, module.default || module);
  }

  customCommandsStore.guardar(commandName, sesion);
  return { fileName };
}

function eliminarComando(commandName) {
  const filePath = `./custom-commands/${commandName}.js`;
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  delete global.plugins[`custom-commands/${commandName}.js`];
  if (global.customCommandsCache) global.customCommandsCache.delete(`${commandName}.js`);
  customCommandsStore.eliminar(commandName);
}

export const customCommandsCodegen = {
  armarCodigoFuente,
  nombreColisiona,
  generarOActualizarComando,
  eliminarComando
};
