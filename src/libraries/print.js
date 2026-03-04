import chalk from "chalk";

const CMD_RE = /^[.!#/\\](\w+)/;
const MEDIA_MAP = new Map([
  ["image",    "🖼️  imagen"  ],
  ["sticker",  "🧩 sticker"  ],
  ["video",    "🎬 video"    ],
  ["audio",    "🎵 audio"    ],
  ["document", "📂 documento"],
]);

const getMedia = (type) => {
  for (const [key, icon] of MEDIA_MAP)
    if (type.includes(key)) return icon;
  return null;
};

const TZ = { timeZone: "America/Argentina/Buenos_Aires" };
const _seen = new Set();
const _recentKeys = new Map();
const _groupNames = new Map();
const MAX_SEEN = 300;
const KEY_TTL = 60000;

const isEdited = (m) => {
  const mtype = m.mtype || "";
  const msg   = m.msg || m.message || {};
  const proto = msg.protocolMessage || m.message?.protocolMessage;
  return (
    mtype === "protocolMessage" ||
    mtype === "editedMessage"   ||
    !!msg.editedMessage         ||
    !!msg.protocolMessage       ||
    !!m.message?.editedMessage  ||
    proto?.type === 14          ||
    proto?.type === 0
  );
};

const buildFallbackKey = (m, chat, msgType) => {
  const ts = m.messageTimestamp || Math.floor(Date.now() / 1000);
  const text = (m.text || m.msg?.conversation || "").slice(0, 40);
  return `${chat}:${msgType}:${ts}:${text}`;
};

const isDuplicate = (m, chat, msgType) => {
  const keyId = m.key?.id;
  const key = keyId ? `id:${keyId}` : buildFallbackKey(m, chat, msgType);
  const now = Date.now();
  const last = _recentKeys.get(key);
  if (last && now - last < KEY_TTL) return true;
  _recentKeys.set(key, now);
  if (_recentKeys.size > 300) {
    for (const [k, t] of _recentKeys)
      if (now - t > KEY_TTL) _recentKeys.delete(k);
  }
  return false;
};

const getGroupName = async (conn, chat) => {
  if (_groupNames.has(chat)) return _groupNames.get(chat);
  try {
    const meta = conn.chats?.[chat] || await conn.groupMetadata?.(chat);
    const name = meta?.subject || meta?.name || null;
    if (name) _groupNames.set(chat, name);
    return name;
  } catch {
    return null;
  }
};

export default async function printMessage(m, conn = { user: {} }) {
  try {
    if (!m?.fromMe) return;

    const chat = m.chat || m.key?.remoteJid || "";
    if (!chat || isEdited(m)) return;

    if (m.msg?.messageStubType || m.message?.messageStubType ||
        m.mtype === 'messageStubType' || m.mtype === 'protocolMessage') return;

    const msgType = (
      m.mtype?.replace(/message$/i, "") ||
      Object.keys(m.msg || {})[0] ||
      "texto"
    ).toLowerCase();

    if (isDuplicate(m, chat, msgType)) return;

    const keyId = m.key?.id;
    if (keyId) {
      if (_seen.has(keyId)) return;
      _seen.add(keyId);
      if (_seen.size > MAX_SEEN) _seen.delete(_seen.values().next().value);
    }

    const text = (
      m.text ||
      m.msg?.conversation ||
      m.msg?.extendedTextMessage?.text ||
      m.msg?.imageMessage?.caption ||
      m.msg?.videoMessage?.caption ||
      ""
    ).replace(/\u200e+/g, "").trim();

    if (/[🟩⬜]{3,}/.test(text)) return;

    const isGroup   = chat.endsWith("@g.us");
    const time      = new Date((m.messageTimestamp || Date.now() / 1000) * 1000).toLocaleTimeString("es-AR", TZ);
    const botNum    = conn.user?.jid?.split("@")[0] || "Bot";
    const groupId   = isGroup ? chat.split("@")[0] : null;
    const command   = CMD_RE.exec(text)?.[1] ?? null;
    const media     = getMedia(msgType);
    const preview   = text.length > 200 ? text.slice(0, 200) + chalk.grey(" ...") : text;
    const groupName = isGroup ? await getGroupName(conn, chat) : null;

    const C   = chalk.cyanBright;
    const row = (icon, label, val) => C("├") + ` ${icon} ${chalk.bold(label)} ${val}`;

    const lines = [
      chalk.bold.cyanBright("╭⋙════ ⋆★⋆ ════⋘•🌙•⋙════ ⋆★⋆ ════⋙╮"),
      chalk.bold.magentaBright("        ✧°ˆ Luna-BotV6 ˆ°✧        ") + "  " + chalk.greenBright("▶ BOT"),
      row("🤖", "Bot:    ", botNum),
      row("⏰", "Hora:   ", chalk.yellow(time)),
      row("📍", "Chat:   ", isGroup
        ? "👥 Grupo: " + chalk.cyanBright(groupName || "Desconocido")
        : "👤 Privado"),
    ];

    if (groupId)    lines.push(row("🆔", "ID:     ", chalk.grey(groupId)));
    if (m.pushname) lines.push(row("👤", "Para:   ", chalk.magentaBright(m.pushname)));
    if (command)    lines.push(row("⚡", "Comando:", chalk.greenBright(command)));
    lines.push(     row("📋", "Tipo:   ", chalk.green(msgType)));
    if (media)      lines.push(row("📎", "Media:  ", media));
    if (text)       lines.push(row("💬", "Texto:  ", chalk.whiteBright(preview)));
    lines.push(chalk.bold.cyanBright("╰⋙════ ⋆★⋆ ════⋘•🌙•⋙════ ⋆★⋆ ════⋙╯"));

    console.log(lines.join("\n"));
  } catch {}
}