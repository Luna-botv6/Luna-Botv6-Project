const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

export function matchPrefix(text, prefix) {
  if (!text) return null;
  
  const prefixes = prefix instanceof RegExp
    ? [[prefix.exec(text), prefix]]
    : Array.isArray(prefix)
      ? prefix.map((p) => {
          const re = p instanceof RegExp ? p : new RegExp(str2Regex(p));
          return [re.exec(text), re];
        })
      : typeof prefix === 'string'
        ? [[new RegExp(str2Regex(prefix)).exec(text), new RegExp(str2Regex(prefix))]]
        : [[[], new RegExp]];

  return prefixes.find((p) => p[1])?.[0]?.[0] || null;
}

export function parseCommandWithPrefix(text, prefix) {
  const noPrefix = text.replace(prefix, '');
  let [command, ...args] = noPrefix.trim().split` `.filter((v) => v);
  args = args || [];
  const _args = noPrefix.trim().split` `.slice(1);
  const textContent = _args.join` `;
  command = (command || '').toLowerCase();

  return {
    command,
    args,
    _args,
    text: textContent,
    noPrefix
  };
}

export function checkCommandAcceptance(plugin, command) {
  const isAccept = plugin.command instanceof RegExp
    ? plugin.command.test(command)
    : Array.isArray(plugin.command)
      ? plugin.command.some((cmd) => cmd instanceof RegExp ? cmd.test(command) : cmd === command)
      : typeof plugin.command === 'string'
        ? plugin.command === command
        : false;

  return isAccept;
}

export function parseCommandText(m, globalPrefix, getSinPrefijo) {
  const usedPrefix = matchPrefix(m.text, globalPrefix);
  const sinPrefijoActivo = getSinPrefijo(m.chat);
  const isCommandText = usedPrefix || (sinPrefijoActivo && m.text?.length > 0);

  const isStickerMessage = m.message?.stickerMessage || (m.quoted && m.quoted.mtype === 'stickerMessage');
  const hasCommandSticker = isStickerMessage && global.db.data.sticker && Object.keys(global.db.data.sticker).length > 0;

  return {
    usedPrefix,
    sinPrefijoActivo,
    isCommandText,
    isStickerMessage,
    hasCommandSticker
  };
}