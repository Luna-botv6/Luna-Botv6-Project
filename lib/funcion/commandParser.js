const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

const sinGlobal = (re) => re.global ? new RegExp(re.source, re.flags.replace('g', '')) : re;

export function matchPrefix(text, prefix) {
  if (!text) return null;
  
  const prefixes = prefix instanceof RegExp
    ? [[sinGlobal(prefix).exec(text)]]
    : Array.isArray(prefix)
      ? prefix.map((p) => {
          const re = sinGlobal(p instanceof RegExp ? p : new RegExp('^' + str2Regex(p)));
          return [re.exec(text)];
        })
      : typeof prefix === 'string'
        ? [[new RegExp('^' + str2Regex(prefix)).exec(text)]]
        : [[[]]];

  return prefixes.find((p) => p[0]?.[0])?.[0]?.[0] || null;
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
    ? sinGlobal(plugin.command).test(command)
    : Array.isArray(plugin.command)
      ? plugin.command.some((cmd) => cmd instanceof RegExp ? sinGlobal(cmd).test(command) : cmd === command)
      : typeof plugin.command === 'string'
        ? plugin.command === command
        : false;

  return isAccept;
}

export function esComandoReal(text, plugins, prefix) {
  try {
    const used = matchPrefix(String(text || ''), prefix)
    if (!used) return false
    const { command } = parseCommandWithPrefix(String(text || ''), used)
    if (!command) return false
    for (const k of Object.keys(plugins || {})) {
      const p = plugins[k]
      if (!p || p.disabled) continue
      if (checkCommandAcceptance(p, command)) return true
    }
  } catch {}
  return false
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