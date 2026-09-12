const handler = async (m, { conn, text, args, isAdmin, isOwner }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.gc_add || {};
  try {
    if (!m.isGroup || !args[0]) {
      return m.reply(t.uso || '*[❗] Uso: `.add 1234567890`*');
    }

    if (!isAdmin && !isOwner) {
      return m.reply(t.solo_admin || '*[❗] Solo admins pueden usar este comando.*');
    }

    const numbers = text.split(',')
      .map(v => v.replace(/[^0-9]/g, ''))
      .filter(v => v.length > 4 && v.length < 20)
      .slice(0, 3);

    if (numbers.length === 0) {
      return m.reply(t.numero_invalido || '*[❗] Número inválido*');
    }

    const num = numbers[0];

    let invite_code;
    let codeGenerated = false;

    try {
      invite_code = await conn.groupInviteCode(m.chat);
      codeGenerated = true;
    } catch (error) {
      codeGenerated = false;
    }

    if (!codeGenerated) {
      const failMsg = t.fail_msg?.replace('{usuario}', m.sender.split('@')[0]).replace('{numero}', num) || `❌ **ERROR: NO SE PUDO GENERAR ENLACE DE INVITACIÓN**

👤 *Usuario:* @${m.sender.split('@')[0]}
📱 *Número a invitar:* +${num}  
📋 *Motivo:* Falta de permisos de administrador

❌ **EL BOT NECESITA PERMISOS DE ADMINISTRADOR**

🔧 *Solución:*
1️⃣ Hacer al bot administrador del grupo
2️⃣ Dar permisos de "Gestionar enlace del grupo"
3️⃣ Reintentar el comando

⚠️ *Administradores, por favor actúen rápidamente.*`;

      return await conn.sendMessage(m.chat, {
        text: failMsg,
        mentions: [m.sender]
      });
    }

    const groupName = await conn.getName(m.chat);
    const invitadorTag = `@${m.sender.split('@')[0]}`;
    const inviteLink = `https://chat.whatsapp.com/${invite_code}`;

const aviso = t.sin_privado?.replace('{numero}', num) || `⚠️ *Nota de privacidad*

Por mi seguridad no puedo escribirle a *+${num}* por privado sin su consentimiento 😊

Acá te armo un mensaje bonito con el enlace del grupo para que se lo reenvíes vos:`;

    const mensajeInvitacion = t.invitacion?.replace('{invitador}', invitadorTag).replace('{grupo}', groupName).replace('{link}', inviteLink) || `✨ **𝐈𝐧𝐯𝐢𝐭𝐚𝐜𝐢ó𝐧 𝐚 𝐆𝐫𝐮𝐩𝐨** ✨

🎉 ¡𝐇𝐨𝐥𝐚! 𝐓𝐢𝐞𝐧𝐞𝐬 𝐮𝐧𝐚 𝐢𝐧𝐯𝐢𝐭𝐚𝐜𝐢ó𝐧 𝐞𝐬𝐩𝐞𝐜𝐢𝐚𝐥 🎉

👤 **𝐈𝐧𝐯𝐢𝐭𝐚𝐝𝐨 𝐩𝐨𝐫:** ${invitadorTag}
🏠 **𝐆𝐫𝐮𝐩𝐨:** ${groupName}

${inviteLink}

🌟 **¡𝐍𝐨𝐬 𝐞𝐧𝐜𝐚𝐧𝐭𝐚𝐫𝐢́𝐚 𝐭𝐞𝐧𝐞𝐫𝐭𝐞 𝐜𝐨𝐧 𝐧𝐨𝐬𝐨𝐭𝐫𝐨𝐬!** 🌟
💫 𝐓𝐨𝐜𝐚 𝐞𝐥 𝐞𝐧𝐥𝐚𝐜𝐞 𝐲 𝐮́𝐧𝐞𝐭𝐞 𝐚 𝐥𝐚 𝐝𝐢𝐯𝐞𝐫𝐬𝐢𝐨́𝐧 💫

💝 _𝐒𝐢 𝐧𝐨 𝐝𝐞𝐬𝐞𝐚𝐬 𝐮𝐧𝐢𝐫𝐭𝐞, 𝐬𝐢𝐦𝐩𝐥𝐞𝐦𝐞𝐧𝐭𝐞 𝐢𝐠𝐧𝐨𝐫𝐚 𝐞𝐬𝐭𝐞 𝐦𝐞𝐧𝐬𝐚𝐣𝐞_ 💝`;

    return await conn.sendMessage(m.chat, {
      text: aviso + '\n\n━━━━━━━━━━━━\n\n' + mensajeInvitacion,
      mentions: [m.sender],
      contextInfo: {
        externalAdReply: {
          mediaUrl: null,
          mediaType: 1,
          title: t.ad_title || 'Invitación a grupo',
          body: groupName,
          previewType: 0,
          sourceUrl: inviteLink
        }
      }
    });

  } catch (error) {
    return await conn.sendMessage(m.chat, {
      text: t.error_critico?.replace('{error}', error.message) || `❌ **ERROR EN SISTEMA DE INVITACIONES**\n\nError: ${error.message}\n\n🔧 *Contacta al administrador del bot.*`
    });
  }
};

handler.help = ['add'];
handler.tags = ['group'];
handler.command = /^(add|agregar|invitar)$/i;
handler.admin = handler.group = true;

export default handler;