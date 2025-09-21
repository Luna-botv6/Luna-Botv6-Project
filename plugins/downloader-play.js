import fetch from "node-fetch";
import yts from "yt-search";
import fs from "fs";
import crypto from "crypto";

const _0x4e7b=()=>Math.random().toString(36).substring(2,15);
const _0x9d3a=(s,k)=>{let r='';for(let i=0;i<s.length;i++)r+=String.fromCharCode(s.charCodeAt(i)^k.charCodeAt(i%k.length));return btoa(r)};
const _0x2f8e=(s,k)=>{const d=atob(s);let r='';for(let i=0;i<d.length;i++)r+=String.fromCharCode(d.charCodeAt(i)^k.charCodeAt(i%k.length));return r};
const _0x6c5d=(arr,key)=>arr.map((c,i)=>c^(key.charCodeAt(i%key.length))).map(c=>String.fromCharCode(c)).join('');

const _0xKey=()=>{
const base=process.env.NODE_ENV||'production';
const pid=process.pid.toString();
return crypto.createHash('md5').update(base+pid).digest('hex').substring(0,16);
};

const _0xData={
0x41:[99,111,110,102,105,103,46,106,115],
0x42:[76,117,110,97,45,66,111,116,118,54],
0x43:[117,116,102,45,56],
0x44:[77,111,122,105,108,108,97,47,53,46,48],
0x45:[97,117,100,105,111,47,109,112,101,103],
0x46:[46,109,112,51]
};

const _0x1a7f=(k)=>String.fromCharCode(..._0xData[k]);

const _0x5f9c={
check:()=>{
const s=Date.now();debugger;const t=Date.now()-s;
if(t>100||typeof devtoolsDetector!=='undefined')process.exit(0);
return true;
},
validate:()=>{
if(!fs.existsSync(_0x1a7f(0x41)))return false;
const content=fs.readFileSync(_0x1a7f(0x41),_0x1a7f(0x43));
return content.includes(_0x1a7f(0x42));
},
integrity:()=>{
try{
const src=fs.readFileSync(process.argv[1]||__filename,'utf-8');
const hash=src.split('').reduce((a,c,i)=>a+c.charCodeAt(0)*i,0);
if(global._0xHash&&global._0xHash!==hash)process.exit(0);
global._0xHash=hash;
return true;
}catch{return false}
},
session:()=>{
if(!global._0xSession){
global._0xSession={
id:_0x4e7b(),
key:_0xKey(),
created:Date.now(),
requests:0
};
}
return global._0xSession;
}
};

const _0xUrls=new Proxy({},{
get:(t,p)=>{
const session=_0x5f9c.session();
if(!session)return null;

if(p==='spotify'){
const base='aHR0cHM6Ly9va2F0c3Utcm9sZXphcGlpei52ZXJjZWwuYXBwL3NlYXJjaC9zcG90aWZ5P3E9';
try{return atob(base)}catch{return null}
}
if(p==='youtube'){
const base='aHR0cHM6Ly9hcGkudnJlZGVuLndlYi5pZC9hcGkveXRtcDM/dXJsPQ==';
try{return atob(base)}catch{return null}
}
if(p==='fetch'){
return async(url,opts={})=>{
if(!url)return null;
session.requests++;
if(session.requests>30)return null;

const delay=Math.random()*300+150;
await new Promise(r=>setTimeout(r,delay));

const headers={
'user-agent':_0x1a7f(0x44),
'accept':'application/json',
'referer':'https://github.com/Luna-botv6/Luna-Botv6-Project',
'x-session-id':session.id,
...opts.headers
};
return fetch(url,{...opts,headers,timeout:25000});
};
}
return null;
}
});

const _0x7c4a=async function(){
const _0xmsg=arguments[0];
const _0xctx=arguments[1];

if(!_0x5f9c.check()||!_0x5f9c.validate()||!_0x5f9c.integrity())return;

try{
const{conn,text,usedPrefix,command}=_0xctx;
const chatId=_0xmsg.chat;

if(!text||!text.trim()){
return conn.reply(chatId,`🎵 *Descargar música*\n\n⚠️ Escribe el nombre de la canción o artista\n💡 Ejemplo: *${usedPrefix}${command} con calma*`,_0xmsg);
}

await conn.reply(chatId,`🔍 *Buscando:* ${text}\n⏳ *Espera un momento...*`,_0xmsg);

let result=null;

try{
const spotifyUrl=_0xUrls.spotify;
if(spotifyUrl){
const fullUrl=spotifyUrl+encodeURIComponent(text);
const response=await _0xUrls.fetch(fullUrl);
if(response&&response.ok){
const data=await response.json();
if(data?.status&&data?.result){
result={
title:data.result.title,
artist:data.result.artist,
duration:data.result.duration,
url:data.result.url,
thumbnail:data.result.thumbnail,
audioUrl:data.result.audio
};
}
}
}
}catch(error){
console.log("Spotify error:",error.message);
}

if(!result){
const searchResult=await yts(text);
const video=searchResult.videos[0];
if(!video)throw new Error("No se encontró nada en YouTube.");

const youtubeUrl=_0xUrls.youtube;
if(!youtubeUrl)throw new Error("Service temporarily unavailable");

const downloadUrl=youtubeUrl+encodeURIComponent(video.url);
const downloadResponse=await _0xUrls.fetch(downloadUrl);
const downloadData=await downloadResponse.json();
if(!downloadData?.status)throw new Error("Error al descargar de YouTube.");

result={
title:video.title,
artist:video.author?.name||"YouTube",
duration:video.timestamp,
url:video.url,
thumbnail:video.thumbnail,
audioUrl:downloadData.result.download_url
};
}

const caption=`🎵 *${result.title||'Sin título'}*\n👤 ${result.artist||'Desconocido'}\n⏱ ${result.duration||''}\n🔗 ${result.url||''}`;

if(result.thumbnail){
await conn.sendMessage(chatId,{image:{url:result.thumbnail},caption},{quoted:_0xmsg});
}else{
await conn.sendMessage(chatId,{text:caption},{quoted:_0xmsg});
}

const cleanTitle=(result.title||'track').replace(/[\\/:*?"<>|]/g,'');
await conn.sendMessage(chatId,{
audio:{url:result.audioUrl},
mimetype:_0x1a7f(0x45),
fileName:cleanTitle+_0x1a7f(0x46)
},{quoted:_0xmsg});

}catch(error){
console.error("Error Play:",error.message);
return _0xctx.conn.reply(_0xmsg.chat,`❌ *Error al obtener audio*\n⚠️ ${error.message}`,_0xmsg);
}
};

_0x7c4a.command=_0x7c4a.help=['play'];
_0x7c4a.tags=['downloader'];
_0x7c4a.description='🎵 Busca y descarga música';

export default _0x7c4a;
