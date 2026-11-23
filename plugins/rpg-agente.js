import { getExp, getMoney } from '../lib/stats.js'
import {
  COSTO,
  DURACION_MS,
  contratarAgente,
  estadoAgente,
  despedirAgente,
  msBonito
} from '../lib/agenteSystem.js'

const nf = (n) => Number(n || 0).toLocaleString('es-AR')

const VENTAJAS = `> 🛡️ *Rescate seguro*: si el Cazador te atrapa, se mete en medio y te libera. Vos perdés solo el *10%* (no el 50%).
> 🧿 *Tótem de regalo*: 45% de chance de darte un *tótem* al contratarlo si no tenés ninguno.
> 💸 *Rompe robos*: a quien intente robarte le saca el *60%* de lo que iba a llevarse.
> 🕵️ *Cubre tu rastro*: acumulás *30% menos* amenaza, el Cazador aparece menos.
> 🏃 *Cubre tu retirada*: *+15%* de escape cuando el Cazador te encuentra.
> ⏳ *Dura 72 horas* (3 días). Cuando se sacrifica, se termina el contrato.`

function panelContratar(prefix = '.') {
  return `🕵️ *AGENTE DE SEGURIDAD — LUNA*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Un guardaespaldas que camina dos pasos atrás tuyo.\n` +
    `No pelea por plata: pelea por vos.\n\n` +
    `💎 *Costo:* ${nf(COSTO.money)} diamantes\n` +
    `⭐ *Costo:* ${nf(COSTO.exp)} EXP\n` +
    `⏳ *Contrato:* ${DURACION_MS / 3600000} horas\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `*Lo que hace por vos:*\n${VENTAJAS}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `*Cómo se contrata:*\n` +
    `> *${prefix}contratar agente* → firmar el contrato\n` +
    `> *${prefix}agente* → ver estado, tiempo y si ya cayó\n` +
    `> *${prefix}agente despedir* → cortar el contrato (sin reintegro)\n\n` +
    `> ⚠️ Solo uno a la vez. Si cae, podés contratar otro.`
}

function panelEstado(estado) {
  const { agente, estado: fase, restanteMs } = estado
  if (!agente || fase === 'ninguno') {
    return `🕵️ *SIN AGENTE*\n\n` +
      `> Caminás solo. Cualquier cazador puede alcanzarte.\n\n` +
      `> 💡 Contratar: *.contratar agente*\n` +
      `> 📖 Ver detalles: *.contratar*`
  }
  if (fase === 'caido') {
    return `🕯️ *${agente.emoji} ${agente.nombre} — CAÍDO*\n\n` +
      `> Se sacrificó por vos. Su contrato terminó ese día.\n` +
      `> 🩸 Motivo: ${agente.motivo === 'rescate' ? 'te sacó de las manos del Cazador' : 'cayó defendiéndote'}\n\n` +
      `> 💡 Contratar otro: *.contratar agente*`
  }
  if (fase === 'vencido' || fase === 'despedido') {
    return `🚪 *${agente.emoji} ${agente.nombre} — ${fase === 'vencido' ? 'CONTRATO VENCIDO' : 'DESPEDIDO'}*\n\n` +
      `> Ya no camina con vos.\n\n` +
      `> 💡 Volver a contratar: *.contratar agente*`
  }
  return `🕵️ *${agente.emoji} ${agente.nombre}* — ACTIVO\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `> _«${agente.lema || 'No vas a caer mientras yo siga de pie.'}»_\n\n` +
    `> ⏳ Le quedan *${msBonito(restanteMs)}* de contrato\n` +
    `> 🛡️ Rescates que hizo: *${agente.rescates || 0}*\n` +
    `> 🧿 Tótem regalado: *${agente.totemRegalado ? 'sí' : 'todavía no'}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `${VENTAJAS}\n\n` +
    `> 🚪 Cortar contrato: *.agente despedir*`
}

const handler = async (m, { conn, args, usedPrefix }) => {
  const prefix = usedPrefix || '.'
  const sub = String(args[0] || '').toLowerCase()
  const sub2 = String(args[1] || '').toLowerCase()

  if (sub === 'ayuda' || sub === 'help' || sub === 'como' || sub === 'info') {
    return conn.sendMessage(m.chat, { text: panelContratar(prefix) }, { quoted: m })
  }

  if (sub === 'despedir' || sub === 'cancelar' || sub === 'cortar') {
    const fuera = despedirAgente(m.sender)
    if (!fuera) {
      return conn.sendMessage(m.chat, { text: `🚪 No tenés ningún agente activo para despedir.\n> 💡 Contratar: *${prefix}contratar agente*` }, { quoted: m })
    }
    return conn.sendMessage(m.chat, {
      text: `🚪 *${fuera.emoji} ${fuera.nombre} se fue.*\n\n> Le pagaste el contrato completo, así que se retira sin reclamos.\n> 📉 Ya no tenés protección.\n\n> 💡 Volver a contratar: *${prefix}contratar agente*`
    }, { quoted: m })
  }

  const quiereContratar = sub === 'agente' || sub === 'guardaespaldas' || sub === 'bodyguard' || sub === 'nuevo'
  if (quiereContratar) {
    const res = contratarAgente(m.sender)
    if (!res.ok) {
      if (res.motivo === 'activo') {
        return conn.sendMessage(m.chat, {
          text: `🕵️ Ya tenés a *${res.agente.emoji} ${res.agente.nombre}* trabajando para vos.\n\n> ⏳ Le quedan *${msBonito(estadoAgente(m.sender).restanteMs)}*\n> 📖 Ver estado: *${prefix}agente*`
        }, { quoted: m })
      }
      if (res.motivo === 'fondos') {
        return conn.sendMessage(m.chat, {
          text: `💸 *NO TE ALCANZA PARA EL CONTRATO*\n\n` +
            `> 💎 Diamantes: *${nf(getMoney(m.sender))}* / ${nf(COSTO.money)}${res.faltaMoney ? ` (te faltan *${nf(res.faltaMoney)}*)` : ''}\n` +
            `> ⭐ EXP: *${nf(getExp(m.sender))}* / ${nf(COSTO.exp)}${res.faltaExp ? ` (te faltan *${nf(res.faltaExp)}*)` : ''}\n\n` +
            `> 💡 El agente no trabaja gratis. Volvé cuando tengas el pago.`
        }, { quoted: m })
      }
      return conn.sendMessage(m.chat, { text: `❌ No se pudo contratar al agente.\n> 💡 Probá de nuevo con *${prefix}contratar agente*` }, { quoted: m })
    }

    const ag = res.agente
    const lineaTotem = res.totem
      ? `\n🧿 *Te dejó un tótem* sobre la mesa: "Por si no llego a tiempo."\n`
      : ''
    return conn.sendMessage(m.chat, {
      text: `🤝 *CONTRATO FIRMADO*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🕵️ *${ag.emoji} ${ag.nombre}* ahora camina detrás tuyo.\n\n` +
        `_«${ag.lema}»_\n` +
        `${lineaTotem}\n` +
        `💎 *-${nf(res.costo.money)}* diamantes\n` +
        `⭐ *-${nf(res.costo.exp)}* EXP\n` +
        `⏳ Contrato por *${DURACION_MS / 3600000} horas*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `> 🛡️ Si el Cazador te atrapa, se sacrifica y te saca de ahí perdiendo solo el 10%.\n` +
        `> 💸 Frena el 60% de los robos.\n` +
        `> 🕵️ Te cubre el rastro: 30% menos amenaza.\n\n` +
        `> 💡 Estado: *${prefix}agente*\n` +
        `> 💡 Recordá: cuando cae, no vuelve.`
    }, { quoted: m })
  }

  const estado = estadoAgente(m.sender)
  if (!sub) {
    return conn.sendMessage(m.chat, { text: estado.activo ? panelEstado(estado) : panelContratar(prefix) }, { quoted: m })
  }
  if (sub === 'estado' || sub === 'status') {
    return conn.sendMessage(m.chat, { text: panelEstado(estado) }, { quoted: m })
  }

  return conn.sendMessage(m.chat, { text: panelContratar(prefix) }, { quoted: m })
}

handler.help = ['contratar agente', 'agente', 'agente despedir']
handler.tags = ['rpg']
handler.command = /^(contratar|agente|guardaespaldas|bodyguard)$/i

export default handler
