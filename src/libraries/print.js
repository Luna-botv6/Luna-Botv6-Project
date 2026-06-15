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

const TZ          = { timeZone: "America/Argentina/Buenos_Aires" };
const _seen       = new Set();
const _recentKeys = new Map();
const _groupNames = new Map();
const _groupCountCache = { ts: 0, count: 0 };
const GROUP_COUNT_TTL = 3000;
const MAX_SEEN    = 300;
const KEY_TTL     = 60000;

const W      = 51;
const STARS  = "  ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦";
const TOP    = "╭" + "─".repeat(W) + "╮";
const DIV    = "├" + "┄".repeat(W) + "┤";
const BOTTOM = "╰" + "─".repeat(W) + "╯";

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
  const ts   = m.messageTimestamp || Math.floor(Date.now() / 1000);
  const text = (m.text || m.msg?.conversation || "").slice(0, 40);
  return `${chat}:${msgType}:${ts}:${text}`;
};

const isDuplicate = (m, chat, msgType) => {
  const keyId = m.key?.id;
  const key   = keyId ? `id:${keyId}` : buildFallbackKey(m, chat, msgType);
  const now   = Date.now();
  const last  = _recentKeys.get(key);
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

const getGroupCount = async (conn) => {
  try {
    const now = Date.now();
    if (now - _groupCountCache.ts < GROUP_COUNT_TTL) return _groupCountCache.count;
    let count = 0;
    if (conn?.chats && typeof conn.chats === "object") {
      try {
        count = Object.keys(conn.chats).filter(k => typeof k === 'string' && k.endsWith('@g.us')).length;
      } catch {
        count = 0;
      }
    }
    if (!count && _groupNames.size) count = _groupNames.size;
    _groupCountCache.ts = now;
    _groupCountCache.count = count;
    return count;
  } catch {
    return _groupCountCache.count || 0;
  }
};

export const invalidateGroupCount = () => {
  _groupCountCache.ts = 0;
};

export const forceGroupCount = (n) => {
  _groupCountCache.ts = Date.now();
  _groupCountCache.count = Number(n) || 0;
};

export default async function printMessage(m, conn = { user: {} }) {
  try {
    if (!m?.fromMe) return;

    const chat = m.chat || m.key?.remoteJid || "";
    if (!chat || isEdited(m)) return;

    if (
      m.msg?.messageStubType    ||
      m.message?.messageStubType ||
      m.mtype === "messageStubType" ||
      m.mtype === "protocolMessage"
    ) return;

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
    const time      = new Date((m.messageTimestamp || Date.now() / 1000) * 1000)
                        .toLocaleTimeString("es-AR", TZ);
    const botNum    = conn.user?.jid?.split("@")[0] || "Bot";
    const groupId   = isGroup ? chat.split("@")[0] : null;
    const command   = global._lastCmd ?? CMD_RE.exec(text)?.[1] ?? null;
    global._lastCmd = null;
    const media     = getMedia(msgType);
    const firstLine = text.split("\n")[0].trim();
    const multiline = text.includes("\n");
    const truncated = firstLine.length > 120 ? firstLine.slice(0, 120) : firstLine;
    const preview   = truncated + (multiline || firstLine.length > 120 ? chalk.hex("#5a5278")(" ...") : "");
    const groupName = isGroup ? await getGroupName(conn, chat) : null;
    const groupCount = await getGroupCount(conn);

    const cStars  = chalk.hex("#7c6af7");
    const cBorder = conn.isSubBot ? chalk.green : chalk.hex("#4a4080");
    const cTitle  = chalk.bold.hex("#f7c97a");
    const cSys    = chalk.bold.hex("#5dd9a4");
    const cBadge  = chalk.bold.hex("#00bfff");
    const cLbl    = chalk.bold.hex("#ff9f43");
    const cTag    = chalk.bold.hex("#50fa7b");
    const cBot    = chalk.bold.hex("#00e5ff");
    const cHrs    = chalk.bold.hex("#ffd166");
    const cGrp    = chalk.bold.hex("#ff79c6");
    const cGid    = chalk.bold.hex("#8be9fd");
    const cEvt    = chalk.bold.hex("#50fa7b");
    const cNom    = chalk.bold.hex("#ffb86c");
    const cCmd    = chalk.bold.hex("#FF00FF");
    const cMed    = chalk.bold.hex("#bd93f9");
    const cArrow  = chalk.bold.hex("#c490f5");
    const cMsg    = chalk.bold.hex("#f8f8f2");

    const chatBadge = conn.isSubBot ? (isGroup ? "▶ SUB-BOT" : "▶ SUB PRIVADO") : (isGroup ? "▶ BOT" : "▶ PRIVADO");
    const row = (label, value) =>
      cBorder("│") + "  " + cLbl(label + " ⟩") + "  " + value;

    const lines = [
      cBorder(TOP),
      cBorder("│") + "  " +
        cTitle("◈ " + (global.BotName || "LUNA-BOTV6") + (conn.isSubBot ? " [SUB]" : "")) + "  " +
        chalk.hex("#5a5278")("·····") + "  " +
        cSys("GROUP: " + String(groupCount)) + "  " +
        chalk.hex("#5a5278")("·····") + "  " +
        cBadge(chatBadge),
      cBorder(DIV),
      row("BOT", cBot(botNum)),
      row("HRS", cHrs(time)),
    ];

    if (isGroup) {
      lines.push(row("GRP", cGrp("👥 " + (groupName || "Desconocido")) + "  " + cTag("‹ grupo ›")));
      lines.push(row("GID", cGid(groupId)));
    } else {
      const whom = m.pushname || m.sender?.split("@")[0] || "privado";
      lines.push(row("USR", cGrp(whom) + "  " + cTag("‹ privado ›")));
    }

    if (isGroup && m.pushname) lines.push(row("NOM", cNom(m.pushname)));
    if (command)               lines.push(row("CMD", cCmd(command)));
    lines.push(                row("EVT", cEvt(msgType)));
    if (media)                 lines.push(row("MED", cMed(media)));

    lines.push(cBorder(DIV));
    lines.push(
      cBorder("│") + "  " + cArrow("⟫") + "  " + (text ? cMsg(preview) : cLbl("sin texto"))
    );
    lines.push(cBorder(BOTTOM));

    console.log(lines.join("\n"));
  } catch {}
}