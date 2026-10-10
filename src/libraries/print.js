import chalk from "chalk";
import { resolveJidToPhone } from "../../lib/funcion/lid-resolver.js";

const CMD_RE = /^[.!#/\\](\w+)/;
const MEDIA_MAP = new Map([
  ["viewonce",   "👻 view once" ],
  ["extendedtext","💬 texto"    ],
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

const pickNombre = (p) => {
  const crudo = p?.name || p?.notify || p?.pushName || p?.pushname || p?.displayName || p?.verifiedName || "";
  const nombre = String(crudo).replace(/\s+/g, " ").trim();
  if (!nombre) return "";
  if (!/[@\d]/.test(nombre)) return nombre.slice(0, 40);
  if (p?.name && !/@/.test(p.name)) return String(p.name).slice(0, 40);
  if (p?.notify && !/@/.test(p.notify)) return String(p.notify).slice(0, 40);
  if (p?.verifiedName) return String(p.verifiedName).slice(0, 40);
  return "";
};

const buscarNombre = (participants, jid) => {
  if (!jid || !Array.isArray(participants)) return "";
  const objetivo = String(jid);
  const digitos = objetivo.split("@")[0];
  const p = participants.find(x => x && (x.id === objetivo || x.lid === objetivo))
    || participants.find(x => x && String(x.id || "").split("@")[0] === digitos)
    || participants.find(x => x && String(x.lid || "").split("@")[0] === digitos)
    || participants.find(x => x && String(x.phoneNumber || "").split("@")[0] === digitos);
  return pickNombre(p || {});
};

const esNumero = (s) => /^\+?[\d\s().-]{5,}$/.test(String(s || "").trim());

const buscarNombreContacto = (conn, phone) => {
  if (!phone) return "";
  const objetivo = phone + "@s.whatsapp.net";
  const fuentes = [conn?.contacts, conn?.store?.contacts, global?.conn?.contacts];
  for (const fuente of fuentes) {
    if (!fuente || typeof fuente !== "object") continue;
    const nombre = pickNombre(fuente[objetivo] || {});
    if (nombre) return nombre;
  }
  return "";
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
const TOP    = "╭" + "━".repeat(W) + "╮";
const DIV    = "├" + "━".repeat(W) + "┤";
const BOTTOM = "╰" + "━".repeat(W) + "╯";

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
    const cutoff = now - KEY_TTL;
    for (const [k, t] of _recentKeys)
      if (t < cutoff) _recentKeys.delete(k);
    while (_recentKeys.size > 300) _recentKeys.delete(_recentKeys.keys().next().value);
  }
  return false;
};

const getGroupMeta = async (conn, chat) => {
  const _gc = global.groupCache?.get(chat);
  const syncParts = conn.chats?.[chat]?.participants || _gc?.data?.participants || _gc?.data?.groupMetadata?.participants || [];
  if (_groupNames.has(chat)) return { name: _groupNames.get(chat), participants: syncParts };
  try {
    const meta = conn.chats?.[chat] || _gc?.data?.groupMetadata || await conn.groupMetadata?.(chat);
    const name = meta?.subject || meta?.name || null;
    const participants = Array.isArray(meta?.participants) ? meta.participants : syncParts;
    if (name) {
      _groupNames.set(chat, name);
      if (_groupNames.size > 300) _groupNames.delete(_groupNames.keys().next().value);
    }
    return { name, participants };
  } catch {
    return { name: null, participants: [] };
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
    const command   = m._lastCmd ?? global._lastCmd ?? CMD_RE.exec(text)?.[1] ?? null;
    global._lastCmd = null;
    const media     = getMedia(msgType);
    const firstLine = text.split("\n")[0].trim();
    const multiline = text.includes("\n");
    const truncated = firstLine.length > 120 ? firstLine.slice(0, 120) : firstLine;
    const preview   = truncated + (multiline || firstLine.length > 120 ? chalk.hex("#5a5278")(" ...") : "");
    const meta = isGroup ? await getGroupMeta(conn, chat) : { name: null, participants: [] };
    const groupName = meta.name;
    const groupCount = await getGroupCount(conn);

    const cBorder = conn.isSubBot ? chalk.green : chalk.magentaBright;
    const cTitle  = chalk.bold.hex("#f7c97a");
    const cSys    = chalk.bold.hex("#5dd9a4");
    const cBadge  = chalk.bold.hex("#00bfff");
    const cLbl    = chalk.bold.hex("#ff9f43");
    const cTag    = chalk.bold.hex("#50fa7b");
    const cBot    = chalk.bold.hex("#00e5ff");
    const cHrs    = chalk.bold.hex("#ffd166");
    const cUsr    = chalk.bold.hex("#ff79c6");
    const cGold   = chalk.yellowBright;
    const cGid    = chalk.bold.hex("#8be9fd");
    const cEvt    = chalk.bold.hex("#50fa7b");
    const cCmd    = chalk.bold.hex("#FF00FF");
    const cArrow  = chalk.bold.hex("#c490f5");
    const cMsg    = chalk.bold.hex("#f8f8f2");

    const chatBadge = conn.isSubBot ? (isGroup ? "▶ SUB-BOT" : "▶ SUB PRIVADO") : (isGroup ? "▶ BOT" : "▶ PRIVADO");
    const row = (label, value) =>
      cBorder("│") + "  " + cLbl(label + " ⟩") + "  " + value;

    const botTitle = (global.getBotName ? global.getBotName(conn) : global.BotName) || "LUNA-BOTV6";
    const _lc = global.latestCommand || null;
    let senderJid = null;
    if (_lc?.sender && _lc?.chat === chat) {
      const _age = _lc.timestamp ? Date.now() - new Date(_lc.timestamp).getTime() : 0;
      if (!_lc.timestamp || (_age >= 0 && _age < 120000)) senderJid = String(_lc.sender);
    }
    let usuario = "desconocido";
    let usuarioGold = true;
    const tomarNombre = (n) => {
      if (n && !esNumero(n)) {
        usuario = String(n).replace(/\s+/g, " ").trim().slice(0, 40);
        usuarioGold = false;
        return true;
      }
      return false;
    };
    if (senderJid) {
      let telefono = null;
      try { telefono = resolveJidToPhone(senderJid, conn); } catch { telefono = null; }
      const phoneJid = telefono ? telefono + "@s.whatsapp.net" : null;
      tomarNombre(_lc?.pushname)
        || tomarNombre(isGroup ? buscarNombre(meta.participants, senderJid) : "")
        || tomarNombre(phoneJid && isGroup ? buscarNombre(meta.participants, phoneJid) : "")
        || tomarNombre(pickNombre(conn.chats?.[senderJid] || {}))
        || tomarNombre(phoneJid ? pickNombre(conn.chats?.[phoneJid] || {}) : "")
        || tomarNombre(buscarNombreContacto(conn, telefono));
      if (usuarioGold && conn.getName) {
        for (const jid of [senderJid, phoneJid]) {
          if (!jid) continue;
          let g = null;
          try { g = await conn.getName(jid); } catch { g = null; }
          if (tomarNombre(typeof g === "string" ? g : null)) break;
        }
      }
      if (usuarioGold && telefono) usuario = telefono;
    }

    const lines = [
      cBorder(TOP),
      cBorder("│") + "  " +
        cTitle("◈ " + botTitle + (conn.isSubBot ? " [SUB]" : "")) + "  " +
        chalk.hex("#5a5278")("·····") + "  " +
        cSys("GRUPO Nº " + String(groupCount)) + "  " +
        chalk.hex("#5a5278")("·····") + "  " +
        cBadge(chatBadge),
      cBorder(DIV),
      row("BOT", cBot(botNum)),
      row("USUARIO", usuarioGold ? cGold(usuario) : cUsr(usuario)),
      row("HORA", cHrs(time)),
    ];

    if (isGroup) {
      lines.push(row("GRUPO", cUsr("👥 " + (groupName || "Desconocido")) + "  " + cTag("‹ grupo ›")));
      lines.push(row("ID", cGid(groupId)));
    } else {
      const whom = m.pushname || m.sender?.split("@")[0] || "privado";
      lines.push(row("CHAT", cUsr("💬 " + whom) + "  " + cTag("‹ privado ›")));
    }

    if (command) {
      const prefijo = /^[.!#/\\]/.exec(_lc?.text || "")?.[0] || ".";
      lines.push(row("COMANDO", cCmd(prefijo + command) + chalk.hex("#5a5278")("  ·  ") + cEvt(media || msgType)));
    } else {
      lines.push(row("EVENTO", cEvt(media || msgType)));
    }

    lines.push(cBorder(DIV));
    lines.push(
      cBorder("│") + "  " + cArrow("⟫") + "  " + (text ? cMsg(preview) : cLbl("sin texto"))
    );
    lines.push(cBorder(BOTTOM));

    console.log(lines.join("\n"));
  } catch {}
}