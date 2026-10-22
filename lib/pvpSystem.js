import fs from 'fs'
import { addMoney, getPlayerState, setPlayerState } from './stats.js'
import { idCanonico, mismoUsuario } from './identidad.js'

const PVP_FILE = './database/pvp.json'
const BET_FILE = './database/pvp_bets.json'
const PRIZES = [3000, 1500, 700]
const TOURNAMENT_PRIZES = [5000, 2000, 1000]
const TOURNAMENT_MIN = 4
const BET_TTL = 10 * 60 * 1000
const WEEKEND_MULT = 2

if (!fs.existsSync('./database')) fs.mkdirSync('./database', { recursive: true })

export function weekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function esFinDeSemana(d = new Date()) {
  const day = d.getDay()
  return day === 0 || day === 6
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return fallback }
}

function writeJSON(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)) } catch {}
}

function topN(ranking, n) {
  return Object.entries(ranking || {})
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0))
    .slice(0, n)
}

function premioSeguro(id, cantidad) {
  try { addMoney(id, cantidad) } catch {}
}

function sumarStat(id, campo, valor) {
  try {
    const u = getPlayerState(id)
    u[campo] = (u[campo] || 0) + valor
    setPlayerState(id, u)
  } catch {}
}

function resolverTorneo(data) {
  const torneo = data.tournament
  if (!torneo || torneo.resolved) return null
  const participantes = Array.isArray(torneo.participants) ? torneo.participants : []
  if (participantes.length < TOURNAMENT_MIN) {
    return { week: data.week, top: [], cancelado: true }
  }
  const ranking = participantes
    .map(id => ({ id, ...(data.ranking[id] || { points: 0, wins: 0, losses: 0 }) }))
    .sort((a, b) => (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0))
  const top = ranking.slice(0, 3)
  top.forEach((r, i) => {
    if (TOURNAMENT_PRIZES[i]) premioSeguro(r.id, TOURNAMENT_PRIZES[i])
    if (i === 0) sumarStat(r.id, 'pvpTournamentWins', 1)
  })
  return { week: data.week, top, cancelado: false }
}

export function readPvp() {
  let data = readJSON(PVP_FILE, {})
  const current = weekKey()
  if (!data.week || data.week !== current) {
    const prevTop = data.week ? topN(data.ranking, 3) : []
    const torneoResuelto = data.week ? resolverTorneo(data) : null
    data = {
      week: current,
      ranking: {},
      tournament: { week: current, participants: [], resolved: false },
      lastWinners: prevTop.length ? { week: data.week, top: prevTop } : data.lastWinners || null,
      lastTournament: torneoResuelto || data.lastTournament || null
    }
    writeJSON(PVP_FILE, data)
    prevTop.forEach((r, i) => {
      if (PRIZES[i]) premioSeguro(r.id, PRIZES[i])
    })
  }
  if (!data.ranking) data.ranking = {}
  if (!data.tournament || data.tournament.week !== current) {
    data.tournament = { week: current, participants: [], resolved: false }
    writeJSON(PVP_FILE, data)
  }
  migrarIdentidades(data)
  return data
}

function migrarIdentidades(data) {
  let changed = false
  const ranking = {}
  for (const [id, valor] of Object.entries(data.ranking || {})) {
    const canonico = idCanonico(id) || id
    if (canonico !== id) changed = true
    if (!ranking[canonico]) {
      ranking[canonico] = { ...valor }
    } else {
      const prev = ranking[canonico]
      prev.wins = (prev.wins || 0) + (valor.wins || 0)
      prev.losses = (prev.losses || 0) + (valor.losses || 0)
      prev.points = (prev.points || 0) + (valor.points || 0)
      prev.streak = Math.max(prev.streak || 0, valor.streak || 0)
      changed = true
    }
  }
  if (changed) data.ranking = ranking

  const participantes = data.tournament?.participants
  if (Array.isArray(participantes)) {
    const vistos = []
    for (const id of participantes) {
      const canonico = idCanonico(id) || id
      if (canonico !== id) changed = true
      if (!vistos.some((x) => mismoUsuario(x, canonico))) vistos.push(canonico)
      else changed = true
    }
    if (vistos.length !== participantes.length || vistos.some((x, i) => x !== participantes[i])) {
      data.tournament.participants = vistos
    }
  }

  if (changed) writeJSON(PVP_FILE, data)
}

export function registerResult(winnerId, loserId) {
  const data = readPvp()
  winnerId = idCanonico(winnerId) || winnerId
  loserId = idCanonico(loserId) || loserId
  const multiplicador = esFinDeSemana() ? WEEKEND_MULT : 1
  const w = data.ranking[winnerId] || { wins: 0, losses: 0, streak: 0, points: 0 }
  const l = data.ranking[loserId] || { wins: 0, losses: 0, streak: 0, points: 0 }
  w.wins = (w.wins || 0) + 1
  w.streak = (w.streak || 0) + 1
  w.points = (w.points || 0) + (25 + Math.min(w.streak, 5) * 5) * multiplicador
  l.losses = (l.losses || 0) + 1
  l.streak = 0
  l.points = Math.max(0, (l.points || 0) - 10)
  data.ranking[winnerId] = w
  data.ranking[loserId] = l
  writeJSON(PVP_FILE, data)
  sumarStat(winnerId, 'pvpWins', 1)
  try {
    const u = getPlayerState(winnerId)
    if ((u.pvpBestStreak || 0) < w.streak) { u.pvpBestStreak = w.streak; setPlayerState(winnerId, u) }
  } catch {}
  return { winner: w, loser: l, multiplicador }
}

export function getRanking(limit = 10) {
  return topN(readPvp().ranking, limit)
}

export function getUserPosition(userId) {
  const data = readPvp()
  const all = topN(data.ranking, 1000)
  const idx = all.findIndex(r => r.id === userId || mismoUsuario(r.id, userId))
  if (idx === -1) return { pos: null, stats: { wins: 0, losses: 0, streak: 0, points: 0 } }
  return { pos: idx + 1, stats: all[idx] }
}

export function getLastWinners() {
  return readPvp().lastWinners
}

export function getPrizes() {
  return PRIZES
}

export function getTournamentPrizes() {
  return TOURNAMENT_PRIZES
}

export function getTournament() {
  const data = readPvp()
  const t = data.tournament || { participants: [] }
  return { participantes: t.participants || [], week: t.week, resolved: !!t.resolved }
}

export function getLastTournament() {
  return readPvp().lastTournament || null
}

export function registerTournament(userId) {
  const data = readPvp()
  userId = idCanonico(userId) || userId
  if (!data.tournament) data.tournament = { week: data.week, participants: [], resolved: false }
  if (data.tournament.resolved) return { ok: false, motivo: 'resuelto', count: data.tournament.participants.length }
  const lista = data.tournament.participants || []
  if (lista.some((x) => mismoUsuario(x, userId))) return { ok: false, motivo: 'ya', count: lista.length }
  lista.push(userId)
  data.tournament.participants = lista
  writeJSON(PVP_FILE, data)
  return { ok: true, count: lista.length }
}

export function unregisterTournament(userId) {
  const data = readPvp()
  const lista = data.tournament?.participants || []
  if (!lista.some((x) => mismoUsuario(x, userId))) return { ok: false, count: lista.length }
  data.tournament.participants = lista.filter((x) => !mismoUsuario(x, userId))
  writeJSON(PVP_FILE, data)
  return { ok: true, count: data.tournament.participants.length }
}

export function readBets() {
  const bets = readJSON(BET_FILE, {})
  const now = Date.now()
  let changed = false
  for (const id of Object.keys(bets)) {
    if (!bets[id] || bets[id].expires < now) { delete bets[id]; changed = true }
  }
  if (changed) writeJSON(BET_FILE, bets)
  return bets
}

export function createBet(from, to, amount, chat) {
  const bets = readBets()
  const fromJid = idCanonico(from) || from
  const toJid = idCanonico(to) || to
  for (const [id, b] of Object.entries(bets)) {
    if (mismoUsuario(b.from, fromJid) && mismoUsuario(b.to, toJid)) delete bets[id]
  }
  const id = `${digitosBet(fromJid)}-${Date.now()}`
  bets[id] = { id, from: fromJid, to: toJid, fromRaw: from, toRaw: to, amount, chat, expires: Date.now() + BET_TTL }
  writeJSON(BET_FILE, bets)
  return bets[id]
}

function digitosBet(jid) {
  return String(jid || '').replace(/@.*$/, '').replace(/\D/g, '') || 'user'
}

export function getBetTo(to, chat) {
  const bets = readBets()
  const found = Object.values(bets)
    .filter(b => (mismoUsuario(b.to, to) || mismoUsuario(b.toRaw, to)) && (!chat || b.chat === chat))
    .sort((a, b) => b.expires - a.expires)[0]
  return found || null
}

export function deleteBet(id) {
  const bets = readBets()
  if (bets[id]) { delete bets[id]; writeJSON(BET_FILE, bets) }
}
