import fs from 'fs';
const configContent = fs.readFileSync('./config.js', 'utf-8');
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado: Luna-Botv6 no encontrado.');

import fetch from 'node-fetch';
import yts from 'yt-search';

const _0x1234 = (function() {
  const _0xabc = ['sendMessage','audio','video','fileName','mimetype','quoted','result','data','downloadUrl','title','maxresdefault.webp'];
  return function(i){ return _0xabc[i]; };
})();

let handler = async (m,{conn,text,usedPrefix,command})=>{
try{
if(!text||!text.trim())return await conn[_0x1234(0)](m.chat,'⚠️ Escribe el nombre de la canción','LunaBot V6',null,[['📋 Menú',`${usedPrefix}menu`],['ℹ️ Ayuda',`${usedPrefix}help`]],null,null,m);
if(command==='play'){
const s=await yts(text),v=s.videos[0];if(!v)return await conn[_0x1234(0)](m.chat,`❌ No se encontró: "${text}"`,'LunaBot V6',null,[['🔄 Reintentar',`${usedPrefix}${command} ${text}`],['📋 Menú',`${usedPrefix}menu`]],null,null,m);
const caption=`*🎵 Música encontrada*\n\n● *Título:* ${v.title}\n● *Publicado:* ${v.ago}\n● *Duración:* ${secondString(v.duration.seconds)}\n● *Vistas:* ${MilesNumber(v.views)}\n● *Autor:* ${v.author.name}\n● *Link:* ${v.url.replace(/^https?:\/\//,'')}\n\n*Selecciona formato*`;
await conn.sendButton(m.chat,caption,'LunaBot V6 - Descargas YouTube',v.thumbnail,[['🎵 Audio',`${usedPrefix}ytmp3 ${v.url}`],['🎬 Video',`${usedPrefix}ytmp4 ${v.url}`]],null,null,m);
}
if(command==='ytmp3'||command==='ytmp4'){
const url=text.trim(),apiUrl=command==='ytmp3'?`https://apis-keith.vercel.app/download/dlmp3?url=${encodeURIComponent(url)}`:`https://apis-keith.vercel.app/download/dlmp4?url=${encodeURIComponent(url)}`,res=await fetch(apiUrl),data=await res.json();
if(!data?.status||!data?.result?.data?.downloadUrl)return await conn[_0x1234(0)](m.chat,'❌ Error al obtener archivo','LunaBot V6',null,[['🔄 Reintentar',`${usedPrefix}${command} ${url}`],['📋 Menú',`${usedPrefix}menu`]],null,null,m);
const fileUrl=data.result.data.downloadUrl,title=data.result.data.title||'Archivo';
command==='ytmp3'?await conn[_0x1234(0)](m.chat,{[_0x1234(1)]:{url:fileUrl},[_0x1234(4)]:'audio/mpeg',[_0x1234(3)]:`${title}.mp3`},{[_0x1234(5)]:m}):await conn[_0x1234(0)](m.chat,{[_0x1234(2)]:{url:fileUrl},[_0x1234(3)]:`${title}.mp4`,[_0x1234(4)]:'video/mp4',caption:title},{[_0x1234(5)]:m});
}}catch(e){console.error(e);await conn[_0x1234(0)](m.chat,'❌ Error al procesar la solicitud','LunaBot V6',null,[['🔄 Reintentar',`${usedPrefix}${command} ${text||''}`],['📋 Menú',`${usedPrefix}menu`]],null,null,m);}
};

handler.command=['play','ytmp3','ytmp4'];
export default handler;

function MilesNumber(n){const e=/(\d)(?=(\d{3})+(?!\d))/g,r='$1.',a=n.toString().split('.');a[0]=a[0].replace(e,r);return a[1]?a.join('.') : a[0];}
function secondString(s){s=Number(s);const d=Math.floor(s/(3600*24)),h=Math.floor((s%(3600*24))/3600),m=Math.floor((s%3600)/60),S=Math.floor(s%60),dD=d>0?d+(d==1?' día, ':' días, '):'',hD=h>0?h+(h==1?' hora, ':' horas, '):'',mD=m>0?m+(m==1?' minuto, ':' minutos, '):'',sD=S>0?S+(S==1?' segundo':' segundos') :'';return dD+hD+mD+sD;}
