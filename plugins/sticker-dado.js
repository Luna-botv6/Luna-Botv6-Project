let handler = async (m, { conn }) => {
  let stickdados = [
    'https://tinyurl.com/gdd01',
    'https://tinyurl.com/gdd02',
    'https://tinyurl.com/gdd003',
    'https://tinyurl.com/gdd004',
    'https://tinyurl.com/gdd05',
    'https://tinyurl.com/gdd006'
  ];
  let url = stickdados[Math.floor(Math.random() * stickdados.length)];
  conn.sendFile(m.chat, url, 'error.webp', null, m, { asSticker: true });};
handler.command = ['dado', 'dados', 'dadu']; 
export default handler;
