import { loadAFK, saveAFK } from '../lib/afkDB.js';

const handler = async (m, { isAdmin, isOwner, command }) => {
    if (!isAdmin && !isOwner) return m.reply('❌ Solo los administradores pueden usar este comando.');

    const chatId = m.chat;
    const chatData = global.db.data.chats[chatId] || {};
    const cmd = command.toLowerCase();

    if (cmd === 'enable') {
        
        if (!m.text?.toLowerCase().includes('afk')) 
            return m.reply('Usa: /enable afk');
        
        chatData.afkAllowed = true;
        global.db.data.chats[chatId] = chatData;
        return m.reply('✅ El estado AFK ha sido activado en este grupo.');
    }

    if (cmd === 'disable') {
        if (!m.text?.toLowerCase().includes('afk')) 
            return m.reply('Usa: /disable afk');

        chatData.afkAllowed = false;
        global.db.data.chats[chatId] = chatData;
        return m.reply('❌ El estado AFK ha sido desactivado en este grupo.');
    }
};

handler.help = ['enable afk', 'disable afk'];
handler.tags = ['main'];
handler.command = /^(enable|disable)$/i;
handler.group = true;
handler.admin = true;

export default handler;
