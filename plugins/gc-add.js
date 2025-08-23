import { prepareWAMessageMedia, generateWAMessageFromContent, getDevice } from "@whiskeysockets/baileys";

const handler = async (m, { conn, text, args, isAdmin, isOwner }) => {
  try {
    if (!m.isGroup || !args[0]) {
      return m.reply('*[❗] Uso: `.add 1234567890`*');
    }
    
    console.log('🔍 INVITES: Verificando...');
    console.log('👤 De:', m.sender);
    console.log('👑 Es admin:', isAdmin);
    console.log('👨‍💼 Es owner:', isOwner);
    
    if (!isAdmin && !isOwner) {
      console.log('❌ Usuario no es admin/owner');
      return m.reply('*[❗] Solo admins pueden usar este comando.*');
    }
    
    console.log('✅ Usuario autorizado');
    
    const FORCE_PERMISSIONS = true;
    console.log('⚡ FORCE_PERMISSIONS activado - Asumiendo permisos del bot');
    
    const numbers = text.split(',')
      .map(v => v.replace(/[^0-9]/g, ''))
      .filter(v => v.length > 4 && v.length < 20)
      .slice(0, 3);

    if (numbers.length === 0) {
      return m.reply('*[❗] Número inválido*');
    }

    const num = numbers[0];
    const jid = num + '@s.whatsapp.net';
    
    console.log(`📞 Procesando: +${num}`);

    let invite_code;
    let codeGenerated = false;
    
    if (FORCE_PERMISSIONS) {
      try {
        console.log('🔗 Generando código de invitación...');
        invite_code = await conn.groupInviteCode(m.chat);
        codeGenerated = true;
        console.log('✅ Código generado exitosamente');
      } catch (error) {
        console.log('❌ Error generando código:', error.message);
        codeGenerated = false;
      }
    }

    if (!codeGenerated) {
      const failMsg = `❌ **ERROR: NO SE PUDO GENERAR ENLACE DE INVITACIÓN**

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

    console.log('🎉 Código generado, enviando invitación...');

    try {
      const groupName = await conn.getName(m.chat);
      const invitadorTag = `@${m.sender.split('@')[0]}`;
      const inviteLink = `https://chat.whatsapp.com/${invite_code}`;
      const device = await getDevice(m.key.id);

      const mensajeInvitacion = `✨ **𝐈𝐧𝐯𝐢𝐭𝐚𝐜𝐢ó𝐧 𝐚 𝐆𝐫𝐮𝐩𝐨** ✨

🎉 ¡𝐇𝐨𝐥𝐚! 𝐓𝐢𝐞𝐧𝐞𝐬 𝐮𝐧𝐚 𝐢𝐧𝐯𝐢𝐭𝐚𝐜𝐢ó𝐧 𝐞𝐬𝐩𝐞𝐜𝐢𝐚𝐥 🎉

👤 **𝐈𝐧𝐯𝐢𝐭𝐚𝐝𝐨 𝐩𝐨𝐫:** ${invitadorTag}
🏠 **𝐆𝐫𝐮𝐩𝐨:** ${groupName}

${inviteLink}

🌟 **¡𝐍𝐨𝐬 𝐞𝐧𝐜𝐚𝐧𝐭𝐚𝐫í𝐚 𝐭𝐞𝐧𝐞𝐫𝐭𝐞 𝐜𝐨𝐧 𝐧𝐨𝐬𝐨𝐭𝐫𝐨𝐬!** 🌟
💫 𝐓𝐨𝐜𝐚 𝐞𝐥 𝐞𝐧𝐥𝐚𝐜𝐞 𝐲 ú𝐧𝐞𝐭𝐞 𝐚 𝐥𝐚 𝐝𝐢𝐯𝐞𝐫𝐬𝐢ó𝐧 💫

💝 _𝐒𝐢 𝐧𝐨 𝐝𝐞𝐬𝐞𝐚𝐬 𝐮𝐧𝐢𝐫𝐭𝐞, 𝐬𝐢𝐦𝐩𝐥𝐞𝐦𝐞𝐧𝐭𝐞 𝐢𝐠𝐧𝐨𝐫𝐚 𝐞𝐬𝐭𝐞 𝐦𝐞𝐧𝐬𝐚𝐣𝐞_ 💝`;

      if (device !== 'desktop' && device !== 'web') {
        await conn.sendMessage(jid, {
          text: mensajeInvitacion,
          mentions: [m.sender]
        });
      } else {
        await conn.sendMessage(jid, {
          text: mensajeInvitacion,
          mentions: [m.sender],
          contextInfo: {
            externalAdReply: {
              mediaUrl: null,
              mediaType: 1,
              title: 'Invitación a grupo',
              body: groupName,
              previewType: 0,
              sourceUrl: inviteLink
            }
          }
        });
      }

      console.log('✅ Invitación enviada');

      const successMsg = `🎉 **𝐈𝐧𝐯𝐢𝐭𝐚𝐜𝐢ó𝐧 𝐄𝐧𝐯𝐢𝐚𝐝𝐚** 🎉

✨ **𝐃𝐞𝐭𝐚𝐥𝐥𝐞𝐬:**
👤 **𝐈𝐧𝐯𝐢𝐭𝐚𝐝𝐨 𝐩𝐨𝐫:** ${invitadorTag}
📱 **𝐍ú𝐦𝐞𝐫𝐨:** +${num}
✅ **𝐄𝐬𝐭𝐚𝐝𝐨:** 𝐄𝐧𝐥𝐚𝐜𝐞 𝐞𝐧𝐯𝐢𝐚𝐝𝐨 𝐞𝐱𝐢𝐭𝐨𝐬𝐚𝐦𝐞𝐧𝐭𝐞

🌟 **¡𝐋𝐚 𝐢𝐧𝐯𝐢𝐭𝐚𝐜𝐢ó𝐧 𝐟𝐮𝐞 𝐞𝐧𝐯𝐢𝐚𝐝𝐚 𝐜𝐨𝐧 é𝐱𝐢𝐭𝐨!** 🌟
💝 _𝐄𝐬𝐩𝐞𝐫𝐚𝐦𝐨𝐬 𝐪𝐮𝐞 𝐬𝐞 𝐮𝐧𝐚 𝐩𝐫𝐨𝐧𝐭𝐨 𝐚 𝐧𝐮𝐞𝐬𝐭𝐫𝐚 𝐜𝐨𝐦𝐮𝐧𝐢𝐝𝐚𝐝_ 💝`;

      await conn.sendMessage(m.chat, {
        text: successMsg,
        mentions: [m.sender, jid]
      });

    } catch (error) {
      console.error('❌ Error enviando invitación:', error);
      
      await conn.sendMessage(m.chat, {
        text: `❌ **ERROR ENVIANDO INVITACIÓN**

📱 *Número:* +${num}
❌ *Error:* ${error.message}

⚠️ *El enlace se generó pero no se pudo enviar.*`
      });
    }

  } catch (error) {
    console.error('❌ ERROR CRÍTICO en invitaciones:', error);
    
    await conn.sendMessage(m.chat, {
      text: `❌ **ERROR EN SISTEMA DE INVITACIONES**\n\nError: ${error.message}\n\n🔧 *Contacta al administrador del bot.*`
    });
  }
};

handler.help = ['add'];
handler.tags = ['group'];
handler.command = /^(add|agregar|invitar)$/i;
handler.admin = handler.group = true;

export default handler;
