import { writeFile, mkdir, unlink, access } from 'fs/promises';
import { getUserStats, getRoleByLevel, getArmorStats, hasArmor, isCapturedByHunter } from '../lib/stats.js';
import { getHunterStatus } from '../lib/hunterSystem.js';
import { extractCommands, buildDestacados } from '../lib/funcion/menuGenerator.js';


const MENU_DIR = './database/WELCOME';
const CUSTOM_IMG = `${MENU_DIR}/menu_image.jpg`;
const CUSTOM_VID = `${MENU_DIR}/menu_video.mp4`;



async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir() {
  try {
    await mkdir(MENU_DIR, { recursive: true });
  } catch {}
}

const handler = async (m, { conn, usedPrefix, isPrems, isOwner, isROwner }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje || 'es';
  const _translate = await global.loadTranslation(idioma);
  const t = _translate?.menu || {};
  const tm = _translate?.plugins?.menu_media || {};

  const cmd = (m.text || '').trim().toLowerCase().replace(/^[^a-z0-9]*/i, '');

  if (usedPrefix == 'a' || usedPrefix == 'A') return;

  if (/^(imgmenu|delimgmenu|vidmenu|delvidmenu)$/i.test(cmd)) {
    if (!isOwner && !isROwner) return m.reply(tm.solo_owner || '❌ Solo el owner puede usar este comando.');

    await ensureDir();

    if (/^delimgmenu$/i.test(cmd)) {
      if (!(await fileExists(CUSTOM_IMG))) return m.reply(tm.img_no_existe);
      await unlink(CUSTOM_IMG);
      return m.reply(tm.img_eliminada);
    }

    if (/^delvidmenu$/i.test(cmd)) {
      if (!(await fileExists(CUSTOM_VID))) return m.reply(tm.vid_no_existe);
      await unlink(CUSTOM_VID);
      return m.reply(tm.vid_eliminado);
    }

    if (/^imgmenu$/i.test(cmd)) {
      let imgBuffer = null;
      if (m.quoted?.mimetype?.startsWith('image/')) {
        imgBuffer = await m.quoted.download().catch(() => null);
      } else if (m.mimetype?.startsWith('image/')) {
        imgBuffer = await m.download().catch(() => null);
      }
      if (!imgBuffer) return m.reply(tm.no_media_img);
      try {
        await writeFile(CUSTOM_IMG, imgBuffer);
        if (await fileExists(CUSTOM_VID)) await unlink(CUSTOM_VID);
        return m.reply(tm.img_guardada);
      } catch {
        return m.reply(tm.error);
      }
    }

    if (/^vidmenu$/i.test(cmd)) {
      let vidBuffer = null;
      if (m.quoted?.mimetype?.startsWith('video/')) {
        vidBuffer = await m.quoted.download().catch(() => null);
      } else if (m.mimetype?.startsWith('video/')) {
        vidBuffer = await m.download().catch(() => null);
      }
      if (!vidBuffer) return m.reply(tm.no_media_vid);
      try {
        await writeFile(CUSTOM_VID, vidBuffer);
        if (await fileExists(CUSTOM_IMG)) await unlink(CUSTOM_IMG);
        return m.reply(tm.vid_guardado);
      } catch {
        return m.reply(tm.error);
      }
    }

    return;
  }

  try {
    let mediaPath = null;
    let mediaType = 'video';

    if (await fileExists(CUSTOM_VID)) {
      mediaPath = CUSTOM_VID;
      mediaType = 'video';
    } else if (await fileExists(CUSTOM_IMG)) {
      mediaPath = CUSTOM_IMG;
      mediaType = 'image';
    } else {
      mediaPath = `./src/assets/images/menu/languages/${idioma}/VID-20250527-WA0006.mp4`;
      const fallbackExists = await fileExists(mediaPath);
      if (!fallbackExists) {
        mediaPath = './src/assets/images/menu/languages/es/VID-20250527-WA0006.mp4';
      }
      mediaType = 'video';
    }

    const stats = getUserStats(m.sender);
    const currentRole = getRoleByLevel(stats.level);
    const { money, joincount, exp, level, premiumTime, limit, hp, maxHp, mysticcoins, lunaCoins, bountyStars, bountyFine, isCaptured } = stats;
    const armor = getArmorStats(m.sender)
    const _tieneArmadura = hasArmor(m.sender)
    const hunterStatus = getHunterStatus(m.sender)
    const inv = stats.inventory || {}
    const buffs = (stats.activeBuffs || []).filter(b => b.expiresAt > Date.now())

    const more = String.fromCharCode(8206);
    const readMore = more.repeat(850);
    const taguser = `@${m.sender.split('@')[0]}`;

    const secciones = buildDestacados(extractCommands(global.plugins || {}), usedPrefix, t);

    const str = `╭━━━━━━━━━━━━━━━━━━━╮
┃  🌙 *${global.BotName || 'Luna-Botv6'} MENU* 🌙
╰━━━━━━━━━━━━━━━━━━━╯

╭━━━『 👤 ${t.perfil_titulo} 』━━━╮
┃ 👋 ${t.hola} ${taguser}
┃
┃ 📊 ${t.nivel}: ${level} • 🎯 ${currentRole}
┃ ⭐ ${t.exp}: ${exp}
┃ 💰 ${t.dinero}: ${money} • 🌙 ${lunaCoins} • 🔮 ${mysticcoins}
┃ 🎫 ${t.limite}: ${limit} • 📝 ${joincount}
┃ 💎 ${t.premium}: ${premiumTime > 0 || isPrems ? '✅' : '❌'}
┃
┃ ❤️ ${t.vida}: ${hp || 0}/${maxHp || 100}
┃ 🛡️ ${t.armadura_label}: ${_tieneArmadura ? `${armor.type} (${armor.durability}/${armor.maxDurability})` : (t.sin_armadura || 'Sin armadura')}
┃ 🚨 Bounty: ${bountyStars ? '⭐'.repeat(bountyStars) + ` (${bountyFine}💎)` : '—'}
┃ ⛓️ ${t.estado_label}: ${isCaptured ? (isCapturedByHunter(m.sender) ? `🎯 ${t.capturado_cazador || 'Capturado por Cazador'}` : `⛓️ ${t.capturado || 'Capturado'}`) : `✅ ${t.libre || 'Libre'}`}
┃ 🎯 ${t.cazador_label}: ${hunterStatus.threat > 0 ? `${hunterStatus.threat}% ${t.amenaza || 'amenaza'}` : '—'}
┃
┃ 🎒 ${t.inventario_label}:
┃   🧿 ${t.totem_label}: ${inv.totem || 0} • 🧪 ${t.pocion_menor_label}: ${inv.pocion_menor || 0}
┃   ⚗️ ${t.pocion_media_label}: ${inv.pocion_media || 0} • 🍶 ${t.pocion_mayor_label}: ${inv.pocion_mayor || 0}
┃   🍖 ${t.carne_label}: ${inv.carne_asada || 0} • 🌿 ${t.elixir_label}: ${inv.elixir_bosque || 0} • 🍱 ${t.festin_label}: ${inv.festin_real || 0}
${buffs.length > 0 ? `┃ ✨ ${t.buffs_label}: ${buffs.map(b => b.type.replace('_', ' ')).join(', ')}` : ''}╰━━━━━━━━━━━━━━━━━━╯

╭━『 ${t.personalizar_titulo} 』━╮
┃ ${t.personalizar_desc}
┃
┃ 🖼️ ${usedPrefix}imgmenu <${t.imagen}>
┃ 🎥 ${usedPrefix}vidmenu <${t.video}>
┃ 🗑️ ${usedPrefix}delimgmenu · ${t.personalizar_restaurar}
┃ 🗑️ ${usedPrefix}delvidmenu · ${t.personalizar_restaurar}
╰━━━━━━━━━━━━━━━━━━╯
${readMore}

╭━━━『 ℹ️ ${t.info_titulo} 』━━━╮
┃ 📜 ${usedPrefix}terminosycondiciones
┃ 👨‍👩‍👧 ${usedPrefix}grupos <${t.canal_oficial}>
┃ 📊 ${usedPrefix}estado <${t.informacion}>
┃ 🤖 ${usedPrefix}infobot
┃ ⚡ ${usedPrefix}speedtest <${t.velocidad}>
┃ 👑 ${usedPrefix}owner <${t.mi_creador}>
┃ ✉️ ${usedPrefix}reporte <${t.texto}>
┃ 🔗 ${usedPrefix}join <link>
┃ 🛠️ ${usedPrefix}lchat <${t.sincroniza}>
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 📚 *MENÚ FULL* 』━━━╮
┃ 📖 ${usedPrefix}masmenu
┃ ✨ ${usedPrefix}iamenu
╰━━━━━━━━━━━━━━━━━━━╯

${secciones}

╭━━━『 🤖 ${t.ia_titulo} 』━━━╮
┃ ${t.ia_desc1}
┃ ${t.ia_desc2}
┃
┃ 🎮 ${usedPrefix}iamenu · ${t.ia_ver}
┃
┃ ${t.ia_ejemplos}:
┃ › @Luna veo veo
┃ › @Luna ${t.ia_ejemplo1}
┃ › @Luna ${t.ia_ejemplo2}
┃ › @Luna ${t.ia_ejemplo3}
┃ › @Luna ${t.ia_ejemplo4}
╰━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━╮
┃  🌙 *${global.BotName || 'Luna-Botv6'}* 🌙
┃  ${t.creado}
╰━━━━━━━━━━━━━━━━━━━╯`.trim();

    const fkontak = {
      key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
      message: {
        contactMessage: {
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${global.BotName || 'Luna'};Bot;;;\nFN:${(global.BotName || 'LunaBot').replace(/[^a-zA-Z0-9]/g, '')}\nTEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nEND:VCARD`
        }
      }
    };

    if (mediaType === 'video') {
      await conn.sendMessage(m.chat, {
        video: { url: mediaPath },
        gifPlayback: true,
        caption: str,
        mentions: [m.sender]
      }, { quoted: fkontak });
    } else {
      await conn.sendMessage(m.chat, {
        image: { url: mediaPath },
        caption: str,
        mentions: [m.sender]
      }, { quoted: fkontak });
    }

    await conn.sendButton(
      m.chat,
      t.ia_boton,
      (global.BotName && global.BotName !== 'Luna-Botv6' ? global.BotName : 'Luna-Botv6-Project') + ' 🌙',
      null,
      [
        [`🤖 ${t.ia_boton_ver}`, `${usedPrefix}iamenu`]
      ],
      null,
      null,
      m
    );

  } catch {
    conn.reply(m.chat, t.error_menu || '❌ Error al mostrar el menú', m);
  }
};

handler.command = /^(menu|menú|memu|memú|help|info|comandos|allmenu|ayuda|cmd|imgmenu|delimgmenu|vidmenu|delvidmenu)$/i;
handler.exp = 50;
handler.fail = null;

export default handler;
