import fetch from 'node-fetch'
import Jimp from 'jimp'

const delitos = [
  'Por no bañarse, la última vez que lo hizo fue hace un mes y el río se quejó formalmente',
  'Por mandar audios de 14 minutos cuando un simple "sí" era suficiente para responder',
  'Por dejar en visto a 7 personas y publicar un estado de "extraño a alguien" a los 5 minutos',
  'Por prometer "ya voy saliendo" estando todavía en pijama viendo el techo de su cuarto',
  'Por comerse la comida del refri ajena y luego preguntar inocentemente si había algo de comer',
  'Por roncar tan fuerte que los vecinos pensaron que había un terremoto de mediana intensidad',
  'Por decir que está a dieta y comerse una pizza entera a medianoche sin remordimiento alguno',
  'Por poner el despertador 11 veces seguidas y apagarlo otras 11 veces sin levantarse ni una',
  'Por tener 4,000 notificaciones sin leer y dormir tranquilamente como si el mundo fuera suyo',
  'Por llorar en Netflix con películas de perros pero ignorar los problemas reales de sus amigos',
  'Por usar el "estoy ocupado" cuando lleva 3 horas mirando videos de gatitos en TikTok',
  'Por distribuir ilusiones sin registro sanitario ni fecha de vencimiento en zona altamente poblada',
  'Por sonreír de manera que altera el orden público y eleva la presión arterial sin previo aviso',
  'Por mandar el "hola" más cargado de intención de la historia y luego desaparecer por 3 días',
  'Por pedir que le cuenten el chiste y luego no reírse para mantener el control emocional del grupo',
  'Por llegar tarde a todo y justificarlo diciendo que el tráfico estuvo terrible en su propia casa',
  'Por mentir diciendo que ya comió cuando está esperando que alguien invite sin preguntar nada',
  'Por robar la cobija de madrugada, negarla con pruebas físicas y voltearse a dormir sin culpa',
  'Por guardar conversaciones comprometedoras como respaldo emocional por si acaso en algún futuro',
  'Por usar el modo avión estratégicamente para evitar responder y luego aparecer como si nada pasara',
  'Por tener 47 series comenzadas, ninguna terminada y la valentía de recomendar todas como imperdibles',
  'Por pedirle el wifi a alguien que acaba de conocer antes incluso de preguntar su nombre',
  'Por fingir que no sabe bailar y luego destrozar la pista cuando suena su canción favorita',
  'Por cantar desafinado en el baño a las 7am poniendo en riesgo la salud mental del vecindario',
  'Por decir "yo invito" y desaparecer misteriosamente cuando llega la cuenta sin dejar rastro',
  'Por tener cara de no haber roto un plato siendo el principal sospechoso de todos los desastres',
  'Por ser el más guapo del grupo y hacerse el humilde como si no supiera perfectamente lo que hace',
  'Por ser la más guapa del grupo y fingir que no sabe por qué todos la miran cuando llega a un lugar',
  'Por andar diciendo "yo quiero jugar" y desaparecer misteriosamente a los 5 minutos sin decir nada',
  'Por aparecer 3 horas después de que empezó el juego diciendo "oigan ya llegué, ¿aún están jugando?"',
  'Por no pagar su parte del juego y siempre tener el "ahorita te la paso" desde el 2019',
  'Por deber fichas, vidas, turnos y favores a medio grupo y seguir pidiendo más con una sonrisa',
  'Por gritar "es que no fue justo" cada vez que pierde pero guardar silencio cuando gana sin problema',
  'Por desaparecer exactamente cuando toca pagar la ronda y reaparecer cuando ya todo está listo',
  'Por decir "una partida más" a las 2am y seguir ahí a las 5am con cara de que todo está bajo control',
  'Por presumir que es el mejor del grupo en todo juego y perder en el primer round sin explicación',
  'Por acusar de trampa a todos menos a sí mismo aunque las pruebas estén ahí frente a todos',
  'Por ser tan buen amigo en los memes pero desaparecer cuando hay que ayudar a cargar algo pesado',
  'Por mandar memes a las 3am sin preguntar si alguien está dormido y luego dormir todo el día',
  'Por ser el alma de la fiesta en el chat grupal pero llegar a la reunión y no decir ni una sola palabra',
]

const BROWN_R = 160
const BROWN_G = 100
const BROWN_B = 40

const recolorWhite = (img) => {
  img.scan(0, 0, img.getWidth(), img.getHeight(), function (x, y, idx) {
    const r = this.bitmap.data[idx]
    const g = this.bitmap.data[idx + 1]
    const b = this.bitmap.data[idx + 2]
    if (r > 200 && g > 200 && b > 200) {
      this.bitmap.data[idx]     = BROWN_R
      this.bitmap.data[idx + 1] = BROWN_G
      this.bitmap.data[idx + 2] = BROWN_B
    }
  })
}

const resolverJidYNombre = async (lidJid, conn, chatId) => {
  try {
    const { getGroupDataForPlugin } = await import('./lib/funcion/pluginHelper.js')
    const { groupMetadata } = await getGroupDataForPlugin(conn, chatId, lidJid)
    const participantes = groupMetadata?.participants || []
    const match = participantes.find(p => p.id === lidJid || p.lid === lidJid)
    if (match?.id) {
      const realJid = match.id
      const numero = realJid.split('@')[0]
      const nombre = conn.getName?.(realJid) || null
      return { jid: realJid, numero, nombre }
    }
  } catch (_) {}
  return { jid: lidJid, numero: lidJid.split('@')[0], nombre: null }
}

const handler = async (m, { conn, text }) => {
  const delito = delitos[Math.floor(Math.random() * delitos.length)]

  let rawJid = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender)
  let realJid = rawJid
  let nombre
  let mentionJid

  if (m.quoted?.sender) {
    realJid = m.quoted.sender
    nombre = m.quoted?.pushName || conn.getName?.(realJid) || realJid.split('@')[0]
    mentionJid = realJid
  } else if (m.mentionedJid?.[0]) {
    try {
      const _meta = await conn.groupMetadata(m.chat)
      const _parts = _meta?.participants || []
      const _lid = m.mentionedJid[0]
      const _match = _parts.find(p => p.id === _lid || p.lid === _lid)
      if (_match?.id) {
        realJid = _match.id
        const _numero = realJid.split('@')[0]
        const _nombre = conn.getName?.(realJid) || conn.contacts?.[realJid]?.name || conn.contacts?.[realJid]?.notify || null
        nombre = _nombre || `@${_numero}`
      } else {
        realJid = m.mentionedJid[0]
        nombre = `@${realJid.split('@')[0]}`
      }
    } catch (_) {
      realJid = m.mentionedJid[0]
      nombre = `@${realJid.split('@')[0]}`
    }
    mentionJid = realJid
    const _textoExtra = text?.replace(/@\S+/g, '').trim()
    const _esNumero = /^[\d\s+\-()]+$/.test(nombre)
    if (_textoExtra) {
      nombre = _textoExtra
    } else if (_esNumero) {
      nombre = '@' + realJid.split('@')[0]
    }
  } else {
    realJid = m.sender
    nombre = m.pushName || conn.getName?.(realJid) || realJid.split('@')[0]
    mentionJid = realJid
  }

  await m.reply('Generando cartel de SE BUSCA...')

  let base = null
  let avatar = null

  try {
    const avatarUrl = await conn.profilePictureUrl(realJid, 'image').catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png')

    const [avatarRes, baseRes] = await Promise.all([
      fetch(avatarUrl),
      fetch('https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/otros/Sebusca.png'),
    ])

    const [avatarBuffer, baseBuffer] = await Promise.all([
      avatarRes.arrayBuffer().then((b) => Buffer.from(b)),
      baseRes.arrayBuffer().then((b) => Buffer.from(b)),
    ])

    ;[base, avatar] = await Promise.all([Jimp.read(baseBuffer), Jimp.read(avatarBuffer)])

    const imgW = base.getWidth()
    const imgH = base.getHeight()

    const photoX = Math.round(imgW * 0.24)
    const photoY = Math.round(imgH * 0.28)
    const photoW = Math.round(imgW * 0.690)
    const photoH = Math.round(imgH * 0.370)

    avatar.cover(photoW, photoH)
    base.composite(avatar, photoX, photoY)
    avatar = null

    const SCALE = 0.5
    base.scale(SCALE)

    const sW = base.getWidth()
    const sH = base.getHeight()

    const nombreX = Math.round(sW * 0.40)
    const nombreY = Math.round(sH * 0.208)
    const delitoX = Math.round(sW * 0.08)
    const delitoY = Math.round(sH * 0.775)
    const delitoMaxW = Math.round(sW * 0.84)
    const delitoMaxH = Math.round(sH * 0.20)

    const [fontBlack32, fontWhite32] = await Promise.all([
      Jimp.loadFont(Jimp.FONT_SANS_32_BLACK),
      Jimp.loadFont(Jimp.FONT_SANS_32_WHITE),
    ])

    for (const [dx, dy] of [[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,-2],[-2,2],[2,2]]) {
      base.print(fontBlack32, nombreX + dx, nombreY + dy, nombre, Math.round(sW * 0.60))
    }
    base.print(fontWhite32, nombreX, nombreY, nombre, Math.round(sW * 0.60))

    const delitoOpts = { text: delito, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }

    for (const [dx, dy] of [[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,-2],[-2,2],[2,2],[-4,0],[4,0],[0,-4],[0,4]]) {
      base.print(fontBlack32, delitoX + dx, delitoY + dy, delitoOpts, delitoMaxW, delitoMaxH)
    }
    base.print(fontWhite32, delitoX, delitoY, delitoOpts, delitoMaxW, delitoMaxH)

    recolorWhite(base)

    base.scale(1 / SCALE)

    const output = await base.getBufferAsync(Jimp.MIME_PNG)
    base = null

    await conn.sendMessage(
      m.chat,
      { image: output, caption: `🚨 *SE BUSCA: @${mentionJid.split('@')[0]}*\n📋 Delito: _${delito}_`, mentions: [mentionJid] },
      { quoted: m }
    )
  } catch (e) {
    await m.reply(`❌ Error: ${e.message}`)
  } finally {
    base = null
    avatar = null
    if (global.gc) global.gc()
  }
}

handler.help = ['sebusca [@usuario o nombre]']
handler.tags = ['maker', 'diversion']
handler.command = /^(sebusca|wanted|sebuscan)$/i

export default handler