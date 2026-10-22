import { getPlayerState, setPlayerState, addMoney, addExp } from '../lib/stats.js'

const MISIONES_POOL = [
  { tipo: 'dailyExp', base: 500,  mult: 1,  recompensa: { money: 300,  exp: 100 }, desc: 'Gana {target} EXP hoy' },
  { tipo: 'dailyExp', base: 1000, mult: 2,  recompensa: { money: 600,  exp: 200 }, desc: 'Gana {target} EXP hoy' },
  { tipo: 'dailyMoney', base: 300, mult: 1, recompensa: { money: 200,  exp: 80 },  desc: 'Gana {target} diamantes hoy' },
  { tipo: 'dailyMoney', base: 800, mult: 2, recompensa: { money: 500,  exp: 150 }, desc: 'Gana {target} diamantes hoy' },
  { tipo: 'dailyMines', base: 3,   mult: 1, recompensa: { money: 250,  exp: 60 },  desc: 'Mina {target} veces hoy' },
  { tipo: 'dailyMines', base: 8,   mult: 2, recompensa: { money: 600,  exp: 150 }, desc: 'Mina {target} veces hoy' },
  { tipo: 'level',     base: 5,   mult: 1, recompensa: { money: 400,  exp: 0 },    desc: 'Alcanza nivel {target}' },
  { tipo: 'level',     base: 15,  mult: 2, recompensa: { money: 1000, exp: 0 },    desc: 'Alcanza nivel {target}' },
  { tipo: 'money',     base: 1000, mult: 1, recompensa: { money: 200,  exp: 50 },  desc: 'Ten {target} diamantes' },
  { tipo: 'money',     base: 5000, mult: 2, recompensa: { money: 500,  exp: 120 }, desc: 'Ten {target} diamantes' },
]

const DESC_KEYS = { dailyExp: 'quest_exp', dailyMoney: 'quest_money', dailyMines: 'quest_mines', level: 'quest_level', money: 'quest_hold' }

function todayKey() {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

function generarMisiones(u) {
  const shuffled = [...MISIONES_POOL].sort(() => Math.random() - 0.5)
  const elegidas = shuffled.slice(0, 3)
  return elegidas.map((m, i) => {
    const target = m.base * m.mult
    return {
      id: i + 1,
      tipo: m.tipo,
      target,
      desc: m.desc.replace('{target}', target.toLocaleString()),
      recompensa: m.recompensa,
      reclamada: false
    }
  })
}

function progreso(u, m) {
  if (m.tipo === 'dailyExp') return u.dailyExp || 0
  if (m.tipo === 'dailyMoney') return u.dailyMoney || 0
  if (m.tipo === 'dailyMines') return u.dailyMines || 0
  if (m.tipo === 'level') return u.level || 0
  if (m.tipo === 'money') return u.money || 0
  return 0
}

function tpl(str, vars) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`))
}

const HELP_MSG =
  `📜 *Misiones Diarias*\n\n` +
  `📋 *Comandos:*\n` +
  `• *misiones* — Ver tus misiones de hoy\n` +
  `• *misiones reclamar* — Reclamar recompensas de misiones completadas\n\n` +
  `🔄 Se renuevan cada día a medianoche.`

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.rpg_misiones || {}
  const userId = m.sender
  const u = getPlayerState(userId)
  const cmd = (args && args[0]) ? args[0].toLowerCase() : ''
  const today = todayKey()

  if (u.questDate !== today) {
    u.questDate = today
    u.quests = generarMisiones(u)
    u.dailyExp = 0
    u.dailyMoney = 0
    u.dailyMines = 0
    setPlayerState(userId, u)
  }

  if (!cmd || cmd === 'help' || cmd === 'ayuda') return m.reply(t.help || HELP_MSG)

  if (cmd === 'reclamar' || cmd === 'claim') {
    let totalMoney = 0
    let totalExp = 0
    let completadas = 0
    for (const mis of u.quests) {
      if (mis.reclamada) continue
      const prog = progreso(u, mis)
      if (prog >= mis.target) {
        mis.reclamada = true
        totalMoney += mis.recompensa.money || 0
        totalExp += mis.recompensa.exp || 0
        completadas++
      }
    }
    setPlayerState(userId, u)
    if (completadas === 0) {
      return m.reply(t.sin_reclamar || '❌ No tienes misiones completadas para reclamar.\n💡 Usa *misiones* para ver tu progreso.')
    }
    if (totalMoney > 0) addMoney(userId, totalMoney)
    if (totalExp > 0) addExp(userId, totalExp)
    return m.reply(tpl(t.reclamadas || '✅ *Reclamaste {cantidad} misión(es)!*\n\n💎 +{money} diamantes\n⭐ +{exp} EXP\n\n💡 Usa *misiones* para ver las restantes.', { cantidad: completadas, money: totalMoney, exp: totalExp }))
  }

  const lines = u.quests.map(mis => {
    const prog = progreso(u, mis)
    const pct = Math.min(100, Math.round((prog / mis.target) * 100))
    const bar = '█'.repeat(Math.round(pct / 20)) + '░'.repeat(5 - Math.round(pct / 20))
    const estado = mis.reclamada
      ? (t.reclamada || '✅ Reclamada')
      : (prog >= mis.target ? (t.completada || '🎉 Completada') : tpl(t.progreso || '⏳ {prog}/{target}', { prog, target: mis.target.toLocaleString() }))
    const desc = tpl(t[DESC_KEYS[mis.tipo]] || mis.desc, { target: mis.target.toLocaleString() })
    return `${mis.id}. ${desc}\n   ${bar} ${pct}% — ${estado}\n   💎 ${mis.recompensa.money} + ⭐ ${mis.recompensa.exp}`
  }).join('\n\n')

  const completadas = u.quests.filter(mis => !mis.reclamada && progreso(u, mis) >= mis.target).length
  return m.reply(`${t.titulo || '📜 *Misiones Diarias*'}\n\n${lines}\n\n${tpl(t.resumen || '📊 Completadas sin reclamar: *{n}*', { n: completadas })}\n${t.reclamar_cmd || '💡 Reclamar: *misiones reclamar*'}`)
}

handler.help = ['misiones', 'quests', 'quest']
handler.tags = ['rpg']
handler.command = ['misiones', 'quests', 'quest']
handler.group = true

export default handler
