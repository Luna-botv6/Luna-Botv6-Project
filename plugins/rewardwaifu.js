import { getUserData, setUserData } from '../lib/datoswaifuusuarios.js'
import { addExp, addMoney } from '../lib/stats.js'

let handler = async (m, { conn, usedPrefix }) => {
  let user = getUserData(m.sender)
  let now = Date.now()
  let cooldown = 24*60*60*1000
  if (!user.harem || user.harem.length===0) return await conn.reply(m.chat, `❌ No tienes waifus reclamada. Usa ${usedPrefix}rw y ${usedPrefix}claim`, m)
  if (user.lastReward && now-user.lastReward<cooldown){
    let remaining=cooldown-(now-user.lastReward)
    let hrs=Math.floor(remaining/3600000)
    let mins=Math.floor((remaining%3600000)/60000)
    return await conn.reply(m.chat, `⏳ Ya recibiste tu recompensa hoy.\nVuelve en ${hrs}h ${mins}m.`, m)
  }
  let totalValor=user.harem.reduce((a,w)=>a+(w.valor||0),0)
  let xpReward=Math.floor(totalValor/100)
  let moneyReward=Math.floor(totalValor/50)
  if(xpReward===0&&moneyReward===0) return await conn.reply(m.chat,'💤 Tus waifus aún no tienen suficiente valor para recompensa.',m)
  addExp(m.sender,xpReward)
  addMoney(m.sender,moneyReward)
  user.lastReward=now
  setUserData(m.sender,user)
  await conn.reply(m.chat,`🎁 Recompensa Gacha 🎁\n\nValor total del harem: ${totalValor}\nXP ganada: +${xpReward}\nMonedas ganadas: +${moneyReward}\n\nSigue coleccionando waifus para obtener más recompensas.`,m)
}

handler.help=['rewardwaifu','rewardgacha']
handler.tags=['rpg','gacha']
handler.command=/^(rewardwaifu|rewardgacha)$/i
handler.exp=0
handler.limit=0
export default handler
