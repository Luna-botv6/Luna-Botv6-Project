import chalk from "chalk";
import { getGroupDataForPlugin } from "./pluginHelper.js";

export function isLidJid(jid) {
  return typeof jid === "string" && jid.endsWith("@lid");
}

export function isPhoneJid(jid) {
  return typeof jid === "string" && (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@c.us"));
}

function resolveFromContacts(lidJid, conn) {
  const sources = [
    conn?.contacts,
    conn?.store?.contacts,
    global?.conn?.contacts,
  ];
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const [contactJid, contact] of Object.entries(source)) {
      if (!contactJid.endsWith("@s.whatsapp.net")) continue;
      if (contact?.lid === lidJid || contact?.lidJid === lidJid) {
        return contactJid.split("@")[0];
      }
    }
  }
  return null;
}

export async function resolveJidToPhone(jid, conn, chatId = null) {
  if (!jid) return null;

  if (isPhoneJid(jid)) return jid.split("@")[0];
  if (!isLidJid(jid)) return jid.split("@")[0];

  if (chatId && chatId.endsWith("@g.us")) {
    try {
      const groupData = await getGroupDataForPlugin(conn, chatId, jid);
      const participant = (groupData.participants || []).find(
        (p) => p.lid === jid || p.id === jid
      );
      if (participant?.id && isPhoneJid(participant.id)) {
        return participant.id.split("@")[0];
      }
    } catch (e) {}
  }

  const fromContacts = resolveFromContacts(jid, conn);
  if (fromContacts) return fromContacts;

  console.log(chalk.yellow(`⚠️ [LID] No se pudo resolver ${jid} a número real`));
  return null;
}

export async function resolveUserId(jid, conn, chatId = null) {
  return resolveJidToPhone(jid, conn, chatId);
}

export async function resolveToPhoneJid(jid, conn, chatId = null) {
  const phone = await resolveJidToPhone(jid, conn, chatId);
  if (!phone) return null;
  return `${phone}@s.whatsapp.net`;
}
