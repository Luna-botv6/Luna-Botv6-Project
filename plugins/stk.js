import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import sharp from 'sharp'

const run = promisify(exec)
const uid = () => path.join(tmpdir(), randomBytes(6).toString('hex'))
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const WP_ARGS = `-vcodec libwebp -lossless 0 -q:v 70 -loop 0 -an`
const WP_STATIC = `-vcodec libwebp -lossless 0 -q:v 80 -vframes 1`

const getFrames = async (buffer) => {
  const isAnimated = buffer.slice(0, 100).includes(Buffer.from('ANIM'))
  const meta = await sharp(buffer, { animated: true }).metadata()
  const pages = isAnimated ? (meta.pages || meta.pageHeight || 1) : 1
  const delay = meta.delay || []
  const frames = []
  for (let i = 0; i < pages; i++) {
    const png = await sharp(buffer, { page: i })
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    frames.push({ png, delay: delay[i] || 80 })
  }
  return frames
}

const aplicarFiltroFrames = async (frames, filtro) => {
  const base = uid()
  const pngs = []
  for (let i = 0; i < frames.length; i++) {
    const inp = `${base}_f${String(i).padStart(4,'0')}.png`
    const out = `${base}_o${String(i).padStart(4,'0')}.png`
    fs.writeFileSync(inp, frames[i].png)
    await run(`ffmpeg -y -i "${inp}" -vf "${filtro}" -vframes 1 "${out}"`)
    fs.unlinkSync(inp)
    pngs.push({ path: out, delay: frames[i].delay })
  }
  const listFile = base + '_list.txt'
  fs.writeFileSync(listFile, pngs.map(f => `file '${f.path}'\nduration ${f.delay / 1000}`).join('\n'))
  const out = base + '_out.webp'
  const args = pngs.length > 1 ? WP_ARGS : WP_STATIC
  await run(`ffmpeg -y -f concat -safe 0 -i "${listFile}" ${args} "${out}"`)
  const result = fs.readFileSync(out)
  ;[listFile, out, ...pngs.map(f => f.path)].forEach(f => { try { fs.unlinkSync(f) } catch {} })
  return result
}

const vibrar = async (png) => {
  const offsets = [[8,4],[-8,4],[8,-4],[-8,-4],[8,4],[-8,4],[8,-4],[-8,-4],
                   [8,4],[-8,4],[8,-4],[-8,-4],[8,4],[-8,4],[8,-4],[-8,-4]]
  const base = uid()
  const inp = base + '_in.png'
  fs.writeFileSync(inp, png)

  const frames = []
  for (let i = 0; i < offsets.length; i++) {
    const [dx, dy] = offsets[i]
    const fr = `${base}_f${String(i).padStart(4,'0')}.png`
    await run(`ffmpeg -y -i "${inp}" -vf "pad=532:520:0:0:black@0,crop=512:512:${8+dx}:${4+dy}" -vframes 1 "${fr}"`)
    frames.push(fr)
  }

  const listFile = base + '_list.txt'
  fs.writeFileSync(listFile, frames.map(f => `file '${f}'\nduration 0.07`).join('\n'))

  const out = base + '_out.webp'
  await run(`ffmpeg -y -f concat -safe 0 -i "${listFile}" ${WP_ARGS} "${out}"`)

  const result = fs.readFileSync(out)
  ;[inp, listFile, out, ...frames].forEach(f => { try { fs.unlinkSync(f) } catch {} })
  return result
}

const EFECTOS_FILTRO = {
  blur:     'boxblur=10:10',
  gris:     'hue=s=0',
  invertir: 'negate',
  deepfry:  'hue=s=3,eq=contrast=2:brightness=0.15',
  oscuro:   'eq=brightness=-0.45:contrast=1.3',
  brillo:   'eq=brightness=0.4:contrast=1.1',
  espejo:   'hflip',
  voltear:  'vflip',
  sepia:    'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
  neon:     'hue=s=0,negate,colorchannelmixer=0:0:0:0:0:1:0:0:0:0:1:0',
  pixelado: 'pixelize=width=16:height=16',
}

const aplicarAnimado = async (png, filtro) => {
  const inp = uid() + '.png'
  const out = uid() + '.webp'
  fs.writeFileSync(inp, png)
  await run(`ffmpeg -y -loop 1 -i "${inp}" -t 1.5 -r 15 -vf "${filtro}" ${WP_ARGS} "${out}"`)
  const result = fs.readFileSync(out)
  fs.unlinkSync(inp); fs.unlinkSync(out)
  return result
}


const vibrarFrames = async (frames) => {
  const offsets = [[8,4],[-8,4],[8,-4],[-8,-4],[8,4],[-8,4],[8,-4],[-8,-4],
                   [8,4],[-8,4],[8,-4],[-8,-4],[8,4],[-8,4],[8,-4],[-8,-4]]
  const base = uid()
  const pngs = []
  for (let i = 0; i < frames.length; i++) {
    const [dx, dy] = offsets[i % offsets.length]
    const inp = `${base}_i${String(i).padStart(4,'0')}.png`
    const out = `${base}_o${String(i).padStart(4,'0')}.png`
    fs.writeFileSync(inp, frames[i].png)
    await run(`ffmpeg -y -i "${inp}" -vf "pad=532:520:0:0:black@0,crop=512:512:${8+dx}:${4+dy}" -vframes 1 "${out}"`)
    fs.unlinkSync(inp)
    pngs.push({ path: out, delay: frames[i].delay })
  }
  const listFile = base + '_list.txt'
  fs.writeFileSync(listFile, pngs.map(f => `file '${f.path}'\nduration ${f.delay / 1000}`).join('\n'))
  const out = base + '_out.webp'
  await run(`ffmpeg -y -f concat -safe 0 -i "${listFile}" ${WP_ARGS} "${out}"`)
  const result = fs.readFileSync(out)
  ;[listFile, out, ...pngs.map(f => f.path)].forEach(f => { try { fs.unlinkSync(f) } catch {} })
  return result
}

const pulsarFrames = async (frames) => {
  const base = uid()
  const pngs = []
  for (let i = 0; i < frames.length; i++) {
    const scale = 1 + 0.12 * Math.sin(2 * Math.PI * i / frames.length)
    const newSize = Math.round(512 * scale)
    const out = `${base}_o${String(i).padStart(4,'0')}.png`
    const scaled = await sharp(frames[i].png)
      .resize(newSize, newSize, { fit: 'fill' })
      .extend({
        top: Math.max(0, Math.round((512 - newSize) / 2)),
        bottom: Math.max(0, Math.round((512 - newSize) / 2)),
        left: Math.max(0, Math.round((512 - newSize) / 2)),
        right: Math.max(0, Math.round((512 - newSize) / 2)),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .resize(512, 512, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer()
    fs.writeFileSync(out, scaled)
    pngs.push({ path: out, delay: frames[i].delay })
  }
  const listFile = base + '_list.txt'
  fs.writeFileSync(listFile, pngs.map(f => `file '${f.path}'\nduration ${f.delay / 1000}`).join('\n'))
  const out = base + '_out.webp'
  await run(`ffmpeg -y -f concat -safe 0 -i "${listFile}" ${WP_ARGS} "${out}"`)
  const result = fs.readFileSync(out)
  ;[listFile, out, ...pngs.map(f => f.path)].forEach(f => { try { fs.unlinkSync(f) } catch {} })
  return result
}

const rotarFrames = async (frames) => {
  const base = uid()
  const pngs = []
  for (let i = 0; i < frames.length; i++) {
    const angle = ((360 / frames.length) * i).toFixed(2)
    const inp = `${base}_i${String(i).padStart(4,'0')}.png`
    const out = `${base}_o${String(i).padStart(4,'0')}.png`
    fs.writeFileSync(inp, frames[i].png)
    await run(`ffmpeg -y -i "${inp}" -vf "rotate=${angle}*3.14159/180:fillcolor=black@0,scale=512:512" -vframes 1 "${out}"`)
    fs.unlinkSync(inp)
    pngs.push({ path: out, delay: frames[i].delay })
  }
  const listFile = base + '_list.txt'
  fs.writeFileSync(listFile, pngs.map(f => `file '${f.path}'\nduration ${f.delay / 1000}`).join('\n'))
  const out = base + '_out.webp'
  await run(`ffmpeg -y -f concat -safe 0 -i "${listFile}" ${WP_ARGS} "${out}"`)
  const result = fs.readFileSync(out)
  ;[listFile, out, ...pngs.map(f => f.path)].forEach(f => { try { fs.unlinkSync(f) } catch {} })
  return result
}


const glitchFrames = async (frames) => {
  const hues = [0, 45, 90, 135, 180, 225, 270, 315]
  const saturaciones = [3, 2.5, 4, 2, 3.5, 2.5, 4, 3]
  const contrastes = [1.6, 1.3, 1.8, 1.4, 1.7, 1.3, 1.9, 1.5]
  const base = uid()
  const pngs = []
  for (let i = 0; i < frames.length; i++) {
    const h = hues[i % hues.length]
    const s = saturaciones[i % saturaciones.length]
    const k = contrastes[i % contrastes.length]
    const inp = `${base}_i${String(i).padStart(4,'0')}.png`
    const out = `${base}_o${String(i).padStart(4,'0')}.png`
    fs.writeFileSync(inp, frames[i].png)
    await run(`ffmpeg -y -i "${inp}" -vf "hue=h=${h}:s=${s},eq=contrast=${k}:brightness=0.05,chromashift=crh=5:crv=-5:cbh=-5:cbv=5" -vframes 1 "${out}"`)
    fs.unlinkSync(inp)
    pngs.push({ path: out, delay: frames[i].delay })
  }
  const listFile = base + '_list.txt'
  fs.writeFileSync(listFile, pngs.map(f => `file '${f.path}'\nduration ${f.delay / 1000}`).join('\n'))
  const out = base + '_out.webp'
  await run(`ffmpeg -y -f concat -safe 0 -i "${listFile}" ${WP_ARGS} "${out}"`)
  const result = fs.readFileSync(out)
  ;[listFile, out, ...pngs.map(f => f.path)].forEach(f => { try { fs.unlinkSync(f) } catch {} })
  return result
}

const EFECTOS = {
  pulsar:     (png) => aplicarAnimado(png, "zoompan=z='1+0.12*sin(2*3.14159*on/15)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=512x512"),
  rotar: async (png) => {
    const base = uid()
    const inp = base + '_in.png'
    fs.writeFileSync(inp, png)
    const PASOS = 12
    const frames = []
    for (let i = 0; i < PASOS; i++) {
      const angle = (360 / PASOS) * i
      const fr = `${base}_f${String(i).padStart(4,'0')}.png`
      await run(`ffmpeg -y -i "${inp}" -vf "rotate=${angle}*3.14159/180:fillcolor=black@0,scale=512:512" -vframes 1 "${fr}"`)
      frames.push(fr)
    }
    const listFile = base + '_list.txt'
    fs.writeFileSync(listFile, frames.map(f => `file '${f}'\nduration 0.08`).join('\n'))
    const out = base + '_out.webp'
    await run(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -vcodec libwebp -lossless 0 -q:v 60 -loop 0 -an "${out}"`)
    const result = fs.readFileSync(out)
    ;[inp, listFile, out, ...frames].forEach(f => { try { fs.unlinkSync(f) } catch {} })
    return result
  },
  glitch:   (png) => aplicarAnimado(png, "hue=h=40*sin(12*t):s=1+0.8*sin(8*t),eq=contrast=1+0.3*sin(6*t)"),
  vibrar,
}

const LISTA = `╔═══════════════════╗
  ✦ *𝗦𝗧𝗜𝗖𝗞𝗘𝗥 𝗘𝗙𝗙𝗘𝗖𝗧𝗦* ✦
╚═══════════════════╝

≺ 🎬 *𝗔𝗡𝗜𝗠𝗔𝗗𝗢𝗦* ≻
┌─────────────────────
│ 〔📳〕*.stk vibrar*
│   ↳ _el sticker tiembla_
│
│ 〔💓〕*.stk pulsar*
│   ↳ _late como un corazón_
│
│ 〔🔄〕*.stk rotar*
│   ↳ _gira 360° completo_
│
│ 〔⚡〕*.stk glitch*
│   ↳ _distorsión de colores_
└─────────────────────

≺ 🖼️ *𝗘𝗦𝗧𝗔́𝗧𝗜𝗖𝗢𝗦* ≻
┌─────────────────────
│ 〔🔥〕*.stk deepfry*
│   ↳ _sobreexposado estilo meme_
│
│ 〔🌫️〕*.stk blur*
│   ↳ _desenfoca la imagen_
│
│ 〔🌑〕*.stk gris*
│   ↳ _blanco y negro clásico_
│
│ 〔🌈〕*.stk invertir*
│   ↳ _invierte todos los colores_
│
│ 〔🌙〕*.stk oscuro*
│   ↳ _oscurece la imagen_
│
│ 〔☀️〕*.stk brillo*
│   ↳ _ilumina la imagen_
│
│ 〔🪞〕*.stk espejo*
│   ↳ _flip horizontal_
│
│ 〔↕️〕*.stk voltear*
│   ↳ _flip vertical_
│
│ 〔🟫〕*.stk sepia*
│   ↳ _tono vintage café_
│
│ 〔💚〕*.stk neon*
│   ↳ _efecto neón verde_
│
│ 〔🟦〕*.stk pixelado*
│   ↳ _efecto pixelado retro_
└─────────────────────

≺ ✍️ *𝗧𝗘𝗫𝗧𝗢* ≻
┌─────────────────────
│ *.stk texto* _Tu frase_
│   ↳ _escribe texto abajo_
│
│ *.stk textoa* _Tu frase_
│   ↳ _escribe texto arriba_
└─────────────────────

📌 *Modo de uso:*
_Respondé a un sticker o imagen_
_con el comando que quieras_ 👇

*.stk vibrar* ｜ *.stk deepfry*
*.stk texto* _Hola mundo_ 🌍`

const handler = async (m, { conn, text }) => {
  const entrada = (text || '').trim()

  if (!entrada || entrada === 'lista') return m.reply(LISTA)

  const quoted = m.quoted
  if (!quoted) throw 'Responde a un sticker o imagen. Ej: .stk vibrar'

  const mtype = quoted.mtype || ''
  if (!['stickerMessage', 'imageMessage'].includes(mtype))
    throw 'Solo funciona con stickers e imágenes.'

  let buffer = await quoted.download()

  await m.reply('⏳')

  const frames = await getFrames(buffer)
  const esAnimado = frames.length > 1
  const png = frames[0].png

  let resultado

  if (entrada.startsWith('texto ') || entrada.startsWith('textoa ')) {
    const posicion = entrada.startsWith('textoa ') ? 'arriba' : 'abajo'
    const textoUser = entrada.replace(/^texto[a]? /, '')

    const FONTSIZE = 38
    const LINE_H   = 50
    const CHAR_W   = FONTSIZE * 0.55
    const CHARS_PL = Math.floor(480 / CHAR_W)

    const lines = []
    let current = ''
    for (const word of textoUser.split(' ')) {
      const test = (current + ' ' + word).trim()
      if (test.length > CHARS_PL && current) { lines.push(current); current = word }
      else current = test
    }
    if (current) lines.push(current)

    const totalH = lines.length * LINE_H
    const startY = posicion === 'arriba' ? 16 : 512 - totalH - 16

    const filtros = lines.map((line, i) => {
      const y = startY + i * LINE_H
      const safe = line.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:')
      return `drawtext=fontfile='${FONT}':text='${safe}':fontcolor=white:fontsize=${FONTSIZE}:borderw=3:bordercolor=black@0.7:x=(w-text_w)/2:y=${y}`
    })

    resultado = await aplicarFiltroFrames(frames, filtros.join(','))

  } else if (EFECTOS_FILTRO[entrada]) {
    resultado = await aplicarFiltroFrames(frames, EFECTOS_FILTRO[entrada])

  } else if (EFECTOS[entrada]) {
    if (esAnimado) {
      if (entrada === 'vibrar') resultado = await vibrarFrames(frames)
      else if (entrada === 'pulsar') resultado = await pulsarFrames(frames)
      else if (entrada === 'rotar') resultado = await rotarFrames(frames)
      else if (entrada === 'glitch') resultado = await glitchFrames(frames)
      else resultado = await EFECTOS[entrada](png)
    } else {
      resultado = await EFECTOS[entrada](png)
    }

  } else {
    throw `Efecto *${entrada}* no existe. Usa .stk lista para ver todos.`
  }

  await conn.sendMessage(m.chat, { sticker: resultado }, { quoted: m })
}

handler.help = ['stk <efecto> | stk lista']
handler.tags = ['sticker', 'fun']
handler.command = /^(stk|stkefecto)$/i

export default handler