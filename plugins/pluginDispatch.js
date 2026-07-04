import downloaderPlay from './downloader-play.js';
import supportPlugin from '../plugins/lunaia/support-plugin.js';
import menuCompleto from './menu_completo_actualizado.js';
import weatherPlugin from '../plugins/lunaia/weather-plugin.js';
import socialPlugin from '../plugins/lunaia/social-plugin.js';
import imagePlugin from '../plugins/lunaia/image-plugin.js';
import musicPlugin from '../plugins/lunaia/music-plugin.js';
import menuPlugin from '../plugins/lunaia/menu-plugin.js';
import tagallPlugin from '../plugins/lunaia/tagall-plugin.js';
import kick2Plugin from '../plugins/lunaia/kick2-plugin.js';
import grupoPlugin from '../plugins/lunaia/grupo-plugin.js';
import configPlugin from '../plugins/lunaia/config-plugin.js';
import downloadPlugin from '../plugins/lunaia/download-plugin.js';
import conversationPlugin from '../plugins/lunaia/conversation-plugin.js';
import mathPlugin from '../plugins/lunaia/math-plugin.js';
import veoveoPlugin from '../plugins/lunaia/veoveo-plugin.js';
import ahorcadoPlugin from '../plugins/lunaia/ahorcado-plugin.js';
import mutePlugin from '../plugins/lunaia/mute-plugin.js';
import banchatPlugin from '../plugins/lunaia/banchat-plugin.js';
import banuserPlugin from '../plugins/lunaia/banuser-plugin.js';
import { isProtectedOwner, resolveTargetForOwnerCheck } from '../lib/funcion/ownerGuard.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const REMOVAL_INTENT = /\b(un\s?mute|desmutear?|des\s?silencia\w*|desilenci\w*|desilensia\w*|quitale?\s*(el\s*)?mute|quitarle\s*(el\s*)?mute|ya\s*puede\s*hablar|dejalo\s*hablar|un\s?ban|desbane\w*|remover\s*ban|quitar\s*ban)\b/i;

async function blockIfOwnerTarget(context, cleanText, allowRemoval) {
  if (allowRemoval && REMOVAL_INTENT.test(cleanText)) return false;
  const rawMentioned = context.msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const raw = context.mentionedJids?.[0]
    || rawMentioned[0]
    || context.msg?.message?.extendedTextMessage?.contextInfo?.participant
    || null;
  if (!raw) return false;
  let participants = context.groupData?.participants || [];
  if (!participants.length && context.conn && context.jid) {
    try {
      const senderForFetch = context.msg?.key?.participant || context.msg?.key?.remoteJid;
      const fresh = await getGroupDataForPlugin(context.conn, context.jid, senderForFetch);
      participants = fresh?.participants || [];
    } catch (e) {}
  }
  const { jid, phoneNumber } = resolveTargetForOwnerCheck(raw, participants);
  if (!isProtectedOwner(jid, phoneNumber)) return false;
  try {
    await context.conn.sendMessage(context.jid, { text: '🛡️ Ese es el owner, ni lo intentes 😂' }, { quoted: context.msg });
  } catch (e) {}
  return true;
}

export async function dispatchToPlugins(cleanText, context) {
  const chatId = context.jid;

  if (banchatPlugin.canHandle(cleanText)) {
    await banchatPlugin.handle(cleanText, context);
  } else if (banuserPlugin.canHandle(cleanText)) {
    if (await blockIfOwnerTarget(context, cleanText, true)) return;
    await banuserPlugin.handle(cleanText, context);
  } else if (veoveoPlugin.canHandle(cleanText, chatId)) {
    await veoveoPlugin.handle(cleanText, context);
  } else if (ahorcadoPlugin.canHandle(cleanText, chatId)) {
    await ahorcadoPlugin.handle(cleanText, context);
  } else if (configPlugin.canHandle(cleanText)) {
    await configPlugin.handle(cleanText, context);
  } else if (downloadPlugin.canHandle(cleanText)) {
    await downloadPlugin.handle(cleanText, context);
  } else if (kick2Plugin.canHandle(cleanText)) {
    if (await blockIfOwnerTarget(context, cleanText, false)) return;
    await kick2Plugin.handle(cleanText, context);
  } else if (tagallPlugin.canHandle(cleanText)) {
    await tagallPlugin.handle(cleanText, context);
  } else if (socialPlugin.canHandle(cleanText)) {
    await socialPlugin.handle(cleanText, context);
  } else if (supportPlugin.canHandle(cleanText)) {
    await supportPlugin.handle(cleanText, context);
  } else if (mutePlugin.canHandle(cleanText)) {
    if (await blockIfOwnerTarget(context, cleanText, true)) return;
    await mutePlugin.handle(cleanText, context);
  } else if (weatherPlugin.canHandle(cleanText)) {
    await weatherPlugin.handle(cleanText, context);
  } else if (imagePlugin.canHandle(cleanText)) {
    await imagePlugin.handle(cleanText, context);
  } else if (musicPlugin.canHandle(cleanText)) {
    await musicPlugin.handle(cleanText, context, downloaderPlay);
  } else if (menuPlugin.canHandle(cleanText)) {
    await menuPlugin.handle(cleanText, context, menuCompleto);
  } else if (grupoPlugin.canHandle(cleanText)) {
    await grupoPlugin.handle(cleanText, context);
  } else if (mathPlugin.canHandle(cleanText)) {
    await mathPlugin.handle(cleanText, context);
  } else {
    await conversationPlugin.handle(cleanText, context);
  }
}
