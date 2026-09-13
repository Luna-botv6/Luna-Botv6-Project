export function getComandosLegibles(command) {
  const list = []
  if (!command) return list
  if (Array.isArray(command)) {
    for (const item of command) {
      if (typeof item === 'string' && item.trim()) list.push(item.trim())
    }
    return list
  }
  if (typeof command === 'string') return command.trim() ? [command.trim()] : list
  if (command instanceof RegExp) {
    const src = command.source
    const tokens = src.match(/[\p{L}\p{N}_]+/gu) || []
    const seen = new Set()
    for (const tok of tokens) {
      if (seen.has(tok)) continue
      seen.add(tok)
      try {
        const re = new RegExp(`^(?:${src})$`, command.flags)
        if (re.test(tok) && !/^\d+$/.test(tok)) list.push(tok)
      } catch {}
    }
    return list
  }
  return list
}

const CATEGORIA_DEFS = [
  { key: 'owner',   match: [/^(owner|propietario)/i] },
  { key: 'gc',      match: [/^gc-/i] },
  { key: 'admin',   match: [/^(admin_system|admin-|antilink-config|aprobar-rechazar|on-off-|config-funciones)/i] },
  { key: 'rpg',     match: [/^rpg-/i, /^(harem|rollwaifu|claimwaifu|votewaifu|rewardwaifu|updatewaifus|mistycslot|dla)$/i] },
  { key: 'game',    match: [/^game-/i, /^(adivemoji|adivinar-pregunta|pista4|rpcancion|veoveo|tarot|fun-|carreraautos|juegos-matematicas)/i] },
  { key: 'sticker', match: [/^sticker-/i, /^(st|stk)\.js$/i, /^(glitter|grafiti|moji|attp|wink-lottie)/i] },
  { key: 'maker',   match: [/^(maker-|marker-|make-)/i, /^(setnamebot)$/i] },
  { key: 'random',  match: [/^random-/i] },
  { key: 'convertidor', match: [/^convertidor/i] },
  { key: 'downloader',  match: [/^(downloader|descargas)/i] },
  { key: 'herramienta', match: [/^(herramienta|tools-|fix-|miid|canalid|unban)/i] },
  { key: 'buscador',     match: [/^buscador-/i, /^(info-|informaragrupos|simularcunple|verbaneados)/i] },
  { key: 'sonido', match: [/^(audio|agregar-audio|eliminar-audio|menu-audio|menu-efectoaudios)/i] },
  { key: 'cmd',    match: [/^cmd-/i, /^(set-idioma)$/i] },
  { key: 'subbot', match: [/^subbot/i, /^listasubbots$/i, /^kicsubkbot$/i, /^(sw-plugin|command-processor)/i] },
  { key: 'test',   match: [/^test-/i, /^(diagnostico|nosoybot|medidor-estado|testram|testbtn)$/i] },
  { key: 'otros',  match: [/.*/] }
]

export function categorizar(filename) {
  const base = filename.replace(/\.js$/i, '')
  for (const def of CATEGORIA_DEFS) {
    if (def.key === 'otros') continue
    if (def.match.some(re => re.test(base))) return def.key
  }
  return 'otros'
}

const EXCLUDED_CMDS = new Set(['menu', 'menú', 'memu', 'memú', 'help', 'info', 'comandos', 'allmenu', 'ayuda', 'cmd', 'imgmenu', 'delimgmenu', 'vidmenu', 'delvidmenu', 'iamenu', 'menuia', 'aimenu', 'aimenú', 'lunamenu', 'masmenu', 'maismenu', 'fullmenu', 'todomenu', 'menus', 'menusia', 'menufull'])

export function extractCommands(plugins) {
  const grupos = {}
  const seenGlobal = new Set()
  for (const name in plugins) {
    const plugin = plugins[name]
    if (!name.endsWith('.js')) continue
    const command = plugin?.command ?? plugin?.handler?.command ?? plugin?.handlerYo?.command
    const cmds = getComandosLegibles(command)
    if (!cmds.length) continue
    const cat = categorizar(name)
    if (!grupos[cat]) grupos[cat] = new Set()
    for (const cmd of cmds) {
      if (EXCLUDED_CMDS.has(cmd.toLowerCase())) continue
      const low = cmd.toLowerCase()
      if (seenGlobal.has(low)) continue
      seenGlobal.add(low)
      grupos[cat].add(cmd)
    }
  }
  return grupos
}

const CAT_EMOJI = {
  owner: '👑',
  gc: '👥',
  admin: '⚙️',
  rpg: '⚔️',
  game: '🎮',
  sticker: '🎨',
  maker: '✨',
  random: '🖼️',
  convertidor: '🔄',
  downloader: '⬇️',
  herramienta: '🛠️',
  buscador: '🔍',
  sonido: '🔊',
  cmd: '📝',
  subbot: '🤖',
  test: '🧪',
  otros: '📦'
}

const CMD_EMOJI = {
  addprem: '💎', userpremium: '💎', addprem2: '💎', userpremium2: '💎', addprem3: '💎', userpremium3: '💎', addprem4: '💎', userpremium4: '💎',
  autoread: '👁️', restart: '🔄', restaurar: '🔄', broadcastall: '📢', borrarchats: '🗑️', clearchats: '🗑️', deletechats: '🗑️', limpiargrupos: '🧹',
  banchat: '🚫', banuser: '🚫', unbanchat: '✅', unbanuser: '✅', block: '⛔', unblock: '✅', banid: '🚫', banlist: '📋', listblock: '📋',
  join: '🔗', leavegc: '👋', out: '👋', salirdelgrupo: '👋', saveimage: '🖼️', setimage: '🖼️', setprefix: '⚙️', resetprefix: '🔁',
  setmessage: '✉️', reporte: '✉️', report: '✉️', edit: '✏️', setctag: '🏷️', edittag: '🏷️', settag: '🏷️', gitpull: '⬇️',
  restaurardatos: '🗄️', backup: '🗄️', respaldo: '🗄️', reinstalar: '📦', actualizar: '📦',
  add: '➕', agregar: '➕', invitar: '➕', kicknum: '🚪', listnum: '📋', listanum: '📋', grouptime: '⏳', gctime: '⏳',
  enable: '✅', disable: '❌', antispam: '🛡️', antidelete: '🛡️', antilink: '🛡️', antitoxic: '🧪', afk: '🌙',
  daily: '🎉', claim: '🎁', claimw: '🎁', rewardwaifu: '🎁', rewardgacha: '🎁', reclamar: '🎁', reclamo: '🎁', shop: '🛒', comprar: '🛒', buy: '🛒', tiendarpb: '🛒',
  harem: '💞', esposas: '💞', waifu: '💃', rollwaifu: '🎴', rob: '🥷', robar: '🥷', robo: '🥷', work: '💼', chambear: '💼', trabajar: '💼',
  gamble: '🎰', apostar: '🎰', apuesta: '🎰', ruleta: '🎡', slots: '🎰', loteria: '🎟️', lotto: '🎟️',
  minar: '⛏️', minardiamantes: '⛏️', minarluna: '⛏️', mintar: '⛏️', mysticmine: '🔮', diamantes: '💠', diamondmine: '💠',
  bal: '💰', balance: '💰', dinero: '💰', mystic: '🔮', luna: '🌙', buyarmadura: '🛡️', armadura: '🛡️',
  veoveo: '👀', ahorcado: '🪢', sopa: '📖', wordfind: '📖', sopadeletras: '📖', buscaminas: '💣', minesweeper: '💣', minas: '💣',
  adivemoji: '😀', adivinar: '😀', carreraautos: '🏎️', rpcancion: '🎵', cancion: '🎵', verdad: '🤔', reto: '🔥', tarot: '🔮',
  adventure: '🗺️', aventura: '🗺️', cazar: '🎯', cazador: '🎯', stats: '📊', share: '📤', vender: '🏷️',
  ppt: '✊✋✌️', piedrapapeltijera: '✊✋✌️', rockpaperscissors: '✊✋✌️', manco: '🤡', pajero: '🤡', prostituta: '💃',
  st: '🏷️', stk: '🏷️', sticker: '🏷️', toimg: '🖼️', tgs: '🎭', emojimix: '😜', attp: '🔤', gif: '🎞️',
  dado: '🎲', dados: '🎲', dadu: '🎲',
  blur: '🌫️', difuminar: '🌫️', difuminar2: '🌫️', pixel: '👾', pixelar: '👾', simpcard: '😍', ytcomment: '💬', lolice: '🍦',
  itssostupid: '🤦', stupid: '🤦', iss: '🤦', setnamebot: '🏷️', marker: '🪄', neko: '🐱', loli: '🎀', lolivid: '🎀',
  to: '🔄', togifaud: '🎞️', ttsc: '🔊', tomp3: '🎵', topdf: '📄', toanime: '🎨', toonce: '🎤',
  gimage: '🖼️', image: '🖼️', imagen: '🖼️', igstory: '📸', ighistoria: '📸', igstalk: '👤',
  ocr: '🔎', calc: '🧮', kalk: '🧮', poll: '📊', encuesta: '📊', fake: '🎭', fakereply: '🎭', fitnah: '🎭', spoiler: '🤐', hidetext: '👻',
  jid: '📇', nowa: '📞', miid: '🆔', canalid: '🆔', whoami: '🪪', readmore: '📖', linkgc: '🔗',
  owner: '👑', creador: '👑', creator: '👑', propietario: '👑', speedtest: '⚡', velocidad: '⚡', estado: '📶', status: '📶', ping: '🏓',
  grupos: '👥', informaragrupos: '👥', listagrupos: '👥', grouplist: '👥', infobot: '🤖', dona: '💝', donar: '💝', apoyar: '💝',
  terminosycondiciones: '📜', terminosycondicionesyprivacidad: '📜', listprem: '💎', premlist: '💎', viplista: '💎', listavip: '💎',
  bass: '🔊', robot: '🤖', slow: '🐢', fast: '🐇', deep: '👹', earrape: '💥', reverse: '🔁', nightcore: '🌙', blower: '🌬️', chipmunk: '🐿️', squirrel: '🐿️',
  addcmd: '📝', delcmd: '🗑️', listcmd: '📋', cmdlist: '📋', setcmd: '📝', cmds: '📝', idioma: '🌐', lang: '🌐', language: '🌐', lingua: '🌐',
  testbtn: '🔘', testram: '🧪', stressram: '🧪', ramtest: '🧪', diagnostico: '🩺', test: '🧪', subbot: '🤖', crear: '➕', listasubbots: '📋',
  mates: '🧠', escape: '🧠', math: '🧮', pregunta: '❓', delttt: '🗑️', acertijo: '🧩', quini6: '🏆', top: '🏆', topgays: '🌈', topotakus: '🎌', formarpareja: '👫', tictactoe: '🎮',
  usarprote: '🛡️', usarproteccion: '🛡️', proteccion: '🛡️', comprarprote: '🛒', verprote: '🛡️', verprotes: '🛡️',
  agaudios: '🎙️', elaudios: '🗑️', audioset: '⚙️',
  play: '🎵', playlist: '📻', spotify: '🎶', facebook: '📘', instagram: '📸', tiktok: '🎵', tiktokimg: '🖼️', pptiktok: '👤', mediafire: '📦', pinterest: '📌', gitclone: '🧬', gdrive: '☁️', twitter: '🐦', ringtone: '📞', stickerpack: '👠', wallpaper: '🖼️',
  kick: '❌', kickall: '❌', grupo: '🔒', promote: '📈', demote: '📉', infogroup: 'ℹ️', resetlink: '♻️', link: '🔗', setname: '📝', setdesc: '🖊️', invocar: '📣', setwelcome: '👋', setbye: '🚶', hidetag: '🙈',
  warn: '⚠️', unwarn: '✅', listwarn: '📄', mute: '🔇', unmute: '🔊', listamute: '📋', limitados: '📋', destraba: '🧹', setpp: '🖼️', setppgc: '🖼️', setppbot: '🖼️',
  toimg: '🖼️', tomp3: '🎧', toptt: '🎙️', tovideo: '🎬', tourl: '🌐', tts: '🗣️',
  efectos: '📋', logos: '🎨', logochristmas: '🎄', logocorazon: '❤️', licencia: '🪪', hornycard: '📞',
  piropo: '💘', consejo: '🧠', fraseromantica: '💌', historiaromantica: '📖',
  kpop: '🎤', cristianoronaldo: '⚽', messi: '⚽', cat: '🐱', dog: '🐶', meme: '🤣', itzy: '🎶', blackpink: '🎀', navidad: '🎄', wpmontaña: '🏔️', wpmontana: '🏔️', pubg: '🔫', wpgaming: '🎮', wpaesthetic: '🌅', wpaesthetic2: '🌇', wprandom: '🎲', wallhp: '📱', wpvehiculo: '🚗', wpmoto: '🏍️', coffee: '☕', pentol: '😀', caricatura: '🎨', ciberespacio: '🌌', technology: '🧠', doraemon: '🐱', hacker: '👾', planeta: '🪐', randomprofile: '👤',
  inspect: '🔍', tamaño: '🖼️', tamano: '🖼️', readviewonce: '👁️', clima: '🌤️', hd: '📄', acortar: '🔗', del: '🗑️', readqr: '📸', qrcode: '📲', styletext: '🖋️', traducir: '🌐', covid: '🦠', horario: '⏰', dropmail: '📩', igstalk: '📱', tiktokstalk: '🎵', img: '🖼️', imgsearch: '🖼️', imgmenua: '🖼️',
  perfil: '👤', verexp: '✨', multa: '💰', lb: '🏆', levelup: '⬆️', s: '🖼️', scircle: '🔵', sremovebg: '✂️', semoji: '😊', qc: '💬', pat: '🤗', slap: '👋', kiss: '😘', wm: '🎁', stickermarker: '🎨', stickerfilter: '✨', animoji: '🥳',
  attp: '📋', attp2: '✏️', attp3: '🔄', ttp: '🔴', ttp2: '🔒', ttp3: '🏀', ttp4: '🔍', ttp5: '💥', ttp6: '🌊', ttp7: '👻', ttp8: '🔥', ttp9: '✍️', ttp10: '💡', ttp11: '⬇️', ttp12: '📈', ttp13: '🎨',
  dsowner: '👑', autoadmin: '👨‍💻', addowner: '🔑', agregarlid: '🔑', delowner: '🗑️', dellid: '🗑️', dardiamantes: '💎', añadirxp: '🌟', anadirxp: '🌟', bc: '📣', bcchats: '📲', bcgc: '💬', bcgc2: '🎬', bcbot: '🤖', cleartpm: '🧹', cleartmp: '🧹', update: '⚡', msg: '💌', comando: '⚙️'
}

function emojiDeComando(cmd, cat) {
  return CMD_EMOJI[cmd] || CMD_EMOJI[cmd.toLowerCase()] || CAT_EMOJI[cat] || '▪️'
}

const TITULOS_KEYS = {
  owner: 'owner_titulo', gc: 'admin_titulo', admin: 'config_titulo', rpg: 'rpg_titulo', game: 'juegos_titulo',
  sticker: 'stickers_titulo', maker: 'logos_titulo', random: 'imagenes_titulo', convertidor: 'convertidores_titulo',
  downloader: 'descargas_titulo', herramienta: 'herramientas_titulo', buscador: 'info_titulo', sonido: 'audios_titulo',
  cmd: 'comandos_titulo', subbot: 'subbots_titulo', test: 'test_titulo', otros: 'otros_titulo'
}

const TITULOS_FALLBACK = {
  owner: 'Owner', gc: 'Grupo y Admin', admin: 'Configuración', rpg: 'RPG', game: 'Juegos',
  sticker: 'Stickers', maker: 'Logos y Efectos', random: 'Imágenes', convertidor: 'Convertidores',
  downloader: 'Descargas', herramienta: 'Herramientas', buscador: 'Info y Busquedas', sonido: 'Audios',
  cmd: 'Comandos', subbot: 'Subbots', test: 'Test', otros: 'Otros'
}

const ORDER = ['owner', 'gc', 'admin', 'rpg', 'game', 'sticker', 'maker', 'random', 'convertidor', 'downloader', 'herramienta', 'buscador', 'sonido', 'cmd', 'subbot', 'test', 'otros']

const FEATURED_CMDS = {
  owner: ['addprem', 'autoread', 'restart', 'banchat', 'unbanchat', 'block', 'unblock', 'join', 'leavegc', 'saveimage', 'setprefix', 'resetprefix', 'resetuser', 'restoreuser', 'autoadmin', 'grouplist', 'blocklist', 'addowner', 'agregarlid', 'banuser', 'unbanuser', 'banid', 'unbanid', 'banlist', 'setppbot', 'reporte', 'gitpull', 'update', 'dardiamantes'],
  gc: ['add', 'kick', 'kicknum', 'listanum', 'grouptime', 'promote', 'demote', 'resetlink', 'link', 'setname', 'setdesc', 'invocar', 'setwelcome', 'setbye', 'hidetag', 'warn', 'unwarn', 'listwarn', 'mute', 'unmute', 'listamute', 'fantasmas', 'setpp', 'grupo', 'del'],
  admin: ['enable', 'disable', 'antispam', 'addowner', 'agregarlid'],
  rpg: ['daily', 'claim', 'claimw', 'rewardwaifu', 'shop', 'harem', 'gamble', 'work', 'rob', 'robard', 'minar', 'minardiamantes', 'mysticmine', 'bal', 'balance', 'buyarmadura', 'armadura', 'comprar', 'comprarprote', 'cazar', 'cazador', 'bounty', 'multa', 'verprotes', 'usarprote', 'rescale', 'rescate', 'levelup', 'cofre', 'adventure', 'rw', 'muerto', 'espia', 'apostar', 'juez', 'mercader', 'vagabundo', 'transferir', 'perfil', 'verexp', 'lb', 'minarluna', 'buscaminas', 'carreraautos'],
  game: ['mates', 'tarot', 'fake', 'ppt', 'love', 'pregunta', 'slot', 'delttt', 'acertijo', 'quini6', 'top', 'topgays', 'topotakus', 'formarpareja', 'verdad', 'reto', 'pista', 'sopadeletras', 'ruleta', 'ahorcado', 'tictactoe', 'batalla', 'veoveo', 'usarprote', 'adventure', 'cazar'],
  sticker: ['st', 'sticker', 'sticker2', 's', 'emojimix', 'scircle', 'sremovebg', 'semoji', 'qc', 'pat', 'slap', 'kiss', 'dado', 'attp', 'attp2', 'stickermarker', 'stickerfilter', 'animoji', 'toimg'],
  maker: ['blur', 'pixelar', 'simpcard', 'lolice', 'itssostupid', 'licencia', 'logochristmas', 'logocorazon', 'logos', 'efectos', 'ytcomment', 'hornycard', 'setnamebot'],
  random: ['kpop', 'cristianoronaldo', 'messi', 'cat', 'dog', 'meme', 'itzy', 'blackpink', 'navidad', 'wpmontaña', 'pubg', 'wpgaming', 'wpaesthetic', 'wpaesthetic2', 'wprandom', 'wallhp', 'wpvehiculo', 'wpmoto', 'coffee', 'pentol', 'caricatura', 'ciberespacio', 'technology', 'doraemon', 'hacker', 'planeta', 'randomprofile'],
  convertidor: ['togifaud', 'toimg', 'tomp3', 'toptt', 'tovideo', 'tourl', 'tts', 'img', 'to', 'topdf'],
  downloader: ['play', 'playlist', 'spotify', 'facebook', 'instagram', 'igstory', 'ighistoria', 'tiktok', 'tiktokimg', 'pptiktok', 'mediafire', 'pinterest', 'gitclone', 'twitter', 'ringtone', 'stickerpack', 'gimage', 'tiktokstalk'],
  herramienta: ['inspect', 'dall-e', 'dalle', 'tamaño', 'readviewonce', 'clima', 'encuesta', 'afk', 'ocr', 'hd', 'acortar', 'calc', 'del', 'readqr', 'qrcode', 'readmore', 'styletext', 'traducir', 'nowa', 'covid', 'horario', 'dropmail', 'igstalk', 'lchat', 'fake', 'poll'],
  buscador: ['owner', 'speedtest', 'estado', 'status', 'grupos', 'infobot', 'dona', 'terminosycondiciones', 'informaragrupos', 'repo', 'host'],
  sonido: ['agaudios', 'elaudios', 'audioset', 'bass', 'robot', 'slow', 'fast', 'deep', 'earrape', 'reverse', 'nightcore'],
  cmd: ['addcmd', 'delcmd', 'listcmd', 'setcmd', 'idioma'],
  subbot: ['subbot', 'listasubbots'],
  test: ['testbtn', 'testram', 'diagnostico'],
  otros: ['afk', 'recordar', 'consejo', 'piropo', 'fraseromantica', 'historiaromantica', 'backup', 'sysinfo']
}

function tituloDe(cat, t) {
  return t[TITULOS_KEYS[cat]] || TITULOS_FALLBACK[cat] || cat
}

function renderSeccion(grupos, usedPrefix, t, cat, cmds, recuadro) {
  const emoji = CAT_EMOJI[cat] || '📦'
  const sorted = [...cmds].sort((a, b) => a.localeCompare(b))
  const lines = []
  if (recuadro) {
    lines.push(`╭━━━『 ${emoji} *${tituloDe(cat, t)}* 』━━━╮`)
    for (const c of sorted) lines.push(`┃ ${emojiDeComando(c, cat)} ${usedPrefix}${c}`)
    lines.push('╰━━━━━━━━━━━━━━━━━━╯')
  } else {
    lines.push(`╭━━━『 ${emoji} *${tituloDe(cat, t)}* 』━━━╮`)
    for (const c of sorted) lines.push(`┃ ${emojiDeComando(c, cat)} ${usedPrefix}${c}`)
    lines.push('╰━━━━━━━━━━━━━━━━━━╯')
  }
  return lines.join('\n')
}

export function buildSections(grupos, usedPrefix, t) {
  const blocks = []
  for (const cat of ORDER) {
    const cmds = grupos[cat]
    if (!cmds || cmds.size === 0) continue
    blocks.push(renderSeccion(grupos, usedPrefix, t, cat, cmds))
  }
  return blocks.join('\n\n')
}

export function buildDestacados(grupos, usedPrefix, t) {
  const blocks = []
  for (const cat of ORDER) {
    const set = grupos[cat]
    if (!set) continue
    const featured = FEATURED_CMDS[cat] || []
    const cmds = new Set()
    for (const f of featured) {
      if (set.has(f) || set.has(f.toLowerCase())) cmds.add(set.has(f) ? f : f.toLowerCase())
    }
    if (cmds.size === 0) continue
    blocks.push(renderSeccion(grupos, usedPrefix, t, cat, cmds))
  }
  return blocks.join('\n\n')
}