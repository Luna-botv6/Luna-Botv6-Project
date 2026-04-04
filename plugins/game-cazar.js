import fs from 'fs'
import path from 'path'
import { addExp, addMoney, removeExp, removeMoney, getUserStats } from '../lib/stats.js'

const COOLDOWN_FILE = './database/cazarcooldown.json'
const COOLDOWN_BASE = 5 * 60 * 1000

let cooldowns = {}
if (fs.existsSync(COOLDOWN_FILE)) {
  cooldowns = JSON.parse(fs.readFileSync(COOLDOWN_FILE))
}

function saveCooldowns() {
  fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(cooldowns, null, 2))
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function calcularPerdida(stats, porcentaje) {
  const exp = Math.floor((stats.exp || 0) * porcentaje)
  const money = Math.floor((stats.money || 0) * porcentaje)
  return { exp: Math.max(exp, 200), money: Math.max(money, 80) }
}

const mundos = [
  {
    nombre: '🌿 Selva Primordial',
    intro: [
      'Te adentras en una selva densa donde la luz del sol apenas penetra...',
      'El suelo cruje bajo tus botas mientras avanzas entre lianas y niebla espesa...',
      'Extraños sonidos resuenan entre los árboles centenarios a tu alrededor...',
      'Una bruma espesa cubre el suelo y algo respira pesado entre los helechos...',
    ],
    animalesComunes: [
      { nombre: '🦌 Ciervo Antiguo', exp: rand(500, 1200), money: rand(50, 200) },
      { nombre: '🐗 Jabalí Furioso', exp: rand(600, 1300), money: rand(80, 250) },
      { nombre: '🐍 Anaconda Gigante', exp: rand(700, 1200), money: rand(90, 220) },
      { nombre: '🦊 Zorro de las Nieblas', exp: rand(700, 1400), money: rand(100, 300) },
      { nombre: '🐻 Oso Pardo Ancestral', exp: rand(1000, 1800), money: rand(150, 350) },
      { nombre: '🦅 Águila Real', exp: rand(1000, 1700), money: rand(180, 300) },
      { nombre: '🦇 Murciélago Nocturno', exp: rand(700, 1200), money: rand(90, 180) },
      { nombre: '🐸 Rana Venenosa', exp: rand(550, 950), money: rand(70, 130) },
      { nombre: '🦡 Tejón Salvaje', exp: rand(700, 1300), money: rand(100, 200) },
      { nombre: '🐒 Mono Araña', exp: rand(600, 1100), money: rand(80, 190) },
      { nombre: '🦎 Iguana Colosal', exp: rand(650, 1150), money: rand(85, 195) },
      { nombre: '🐆 Leopardo Manchado', exp: rand(900, 1600), money: rand(140, 310) },
    ],
    animalesRaros: [
      { nombre: '🐉 Dragón de la Selva', exp: rand(2000, 3000), money: rand(400, 700) },
      { nombre: '🦁 León de las Sombras', exp: rand(1800, 2800), money: rand(350, 650) },
      { nombre: '🐆 Pantera Espectral', exp: rand(1700, 2600), money: rand(320, 600) },
      { nombre: '🌿 Titán Vegetal', exp: rand(2200, 3500), money: rand(450, 750) },
    ],
  },
  {
    nombre: '🏔️ Cumbres Glaciales',
    intro: [
      'El viento helado azota tu rostro mientras escalas los picos eternos...',
      'La nieve cruje bajo tus pies y un rugido lejano te pone en alerta...',
      'Entre la tormenta de hielo, algo se mueve en la oscuridad blanca...',
      'La temperatura baja de golpe y tu aliento se congela en el aire...',
    ],
    animalesComunes: [
      { nombre: '🐺 Lobo Ártico', exp: rand(800, 1500), money: rand(120, 280) },
      { nombre: '🦌 Reno de las Nieves', exp: rand(600, 1200), money: rand(80, 200) },
      { nombre: '🐦 Cóndor de las Alturas', exp: rand(900, 1600), money: rand(130, 290) },
      { nombre: '🐻‍❄️ Oso Polar Colosal', exp: rand(1200, 2000), money: rand(200, 400) },
      { nombre: '🦊 Zorro Ártico', exp: rand(700, 1300), money: rand(100, 230) },
      { nombre: '🦭 Foca Glacial', exp: rand(500, 1000), money: rand(70, 170) },
      { nombre: '🦬 Bisonte de Hielo', exp: rand(1000, 1700), money: rand(160, 320) },
    ],
    animalesRaros: [
      { nombre: '❄️ Yeti de las Cumbres', exp: rand(2200, 3500), money: rand(450, 800) },
      { nombre: '🐉 Dragón de Hielo', exp: rand(2500, 4000), money: rand(500, 900) },
      { nombre: '🌨️ Elemental de Tormenta', exp: rand(2000, 3200), money: rand(420, 780) },
    ],
  },
  {
    nombre: '🌊 Abismo Marino',
    intro: [
      'Con tu traje de buceo te sumerges en las profundidades oscuras del océano...',
      'Las corrientes te arrastran hacia zonas donde ningún humano ha llegado antes...',
      'Criaturas luminiscentes te rodean mientras desciendes al abismo...',
      'La presión del agua aumenta y algo enorme pasa rozando tu pierna...',
    ],
    animalesComunes: [
      { nombre: '🦈 Tiburón Blanco', exp: rand(1000, 1800), money: rand(150, 350) },
      { nombre: '🐙 Pulpo Colosal', exp: rand(800, 1500), money: rand(120, 280) },
      { nombre: '🐡 Pez Globo Venenoso', exp: rand(600, 1100), money: rand(90, 200) },
      { nombre: '🦑 Calamar Gigante', exp: rand(1100, 1900), money: rand(160, 360) },
      { nombre: '🐬 Delfín Asesino', exp: rand(700, 1300), money: rand(100, 240) },
      { nombre: '🦀 Cangrejo Abisal', exp: rand(750, 1400), money: rand(110, 260) },
      { nombre: '🐠 Piraña de las Profundidades', exp: rand(650, 1200), money: rand(95, 220) },
    ],
    animalesRaros: [
      { nombre: '🦕 Leviatán Marino', exp: rand(2500, 4000), money: rand(500, 950) },
      { nombre: '👾 Kraken Ancestral', exp: rand(3000, 5000), money: rand(600, 1100) },
      { nombre: '🌊 Hidra Oceánica', exp: rand(2800, 4500), money: rand(560, 1000) },
    ],
  },
  {
    nombre: '🌋 Tierras de Fuego',
    intro: [
      'El calor abrasa tu piel mientras caminas sobre roca volcánica recién enfriada...',
      'Columnas de lava iluminan el cielo nocturno mientras algo te observa...',
      'El suelo tiembla y grietas ardientes se abren a tus pies...',
      'Un siseo emerge de la lava y dos ojos brillantes te fijan desde las llamas...',
    ],
    animalesComunes: [
      { nombre: '🦎 Lagarto de Magma', exp: rand(900, 1600), money: rand(140, 300) },
      { nombre: '🐍 Serpiente de Fuego', exp: rand(800, 1500), money: rand(120, 270) },
      { nombre: '🦂 Escorpión de Lava', exp: rand(700, 1300), money: rand(100, 220) },
      { nombre: '🦅 Fénix Menor', exp: rand(1100, 1900), money: rand(170, 370) },
      { nombre: '🔥 Espíritu de Brasas', exp: rand(950, 1700), money: rand(145, 330) },
    ],
    animalesRaros: [
      { nombre: '🔥 Salamandra Primordial', exp: rand(2300, 3800), money: rand(480, 880) },
      { nombre: '🐉 Dragón de Fuego Antiguo', exp: rand(3000, 5000), money: rand(600, 1100) },
      { nombre: '🌋 Gólem de Volcán', exp: rand(2600, 4200), money: rand(530, 960) },
    ],
  },
  {
    nombre: '🌌 Dimensión Oscura',
    intro: [
      'Un portal dimensional te absorbe y apareces en un mundo sin cielo conocido...',
      'Las leyes de la física no aplican aquí, el tiempo fluye diferente...',
      'Seres que desafían toda lógica se materializan a tu alrededor...',
      'Tu brújula gira sin control y el aire sabe a electricidad y miedo...',
    ],
    animalesComunes: [
      { nombre: '👻 Espectro Devorador', exp: rand(1000, 1800), money: rand(150, 350) },
      { nombre: '🌑 Sombra Viviente', exp: rand(900, 1700), money: rand(130, 320) },
      { nombre: '💀 Esqueleto Dimensional', exp: rand(800, 1500), money: rand(120, 280) },
      { nombre: '🕷️ Arácnido del Vacío', exp: rand(1100, 1900), money: rand(160, 360) },
      { nombre: '🌀 Vórtice Carnívoro', exp: rand(1050, 1850), money: rand(155, 345) },
      { nombre: '🦇 Murciélago del Abismo', exp: rand(950, 1700), money: rand(140, 310) },
    ],
    animalesRaros: [
      { nombre: '🌀 Devorador de Mundos', exp: rand(3500, 6000), money: rand(700, 1300) },
      { nombre: '👁️ El Observador Eterno', exp: rand(4000, 7000), money: rand(800, 1500) },
      { nombre: '🌑 Rey de las Sombras', exp: rand(3800, 6500), money: rand(760, 1400) },
    ],
  },
  {
    nombre: '🚀 Planeta Nexar-7',
    intro: [
      'Tu nave aterriza en un planeta con dos lunas y cielos de color violeta...',
      'La atmósfera tiene un olor metálico y las plantas emiten luz propia...',
      'Señales de radar detectan movimiento masivo acercándose a tu posición...',
      'El suelo pulsa como si el planeta mismo estuviera vivo y hambriento...',
    ],
    animalesComunes: [
      { nombre: '👽 Xenomorfo Cazador', exp: rand(1100, 2000), money: rand(180, 400) },
      { nombre: '🛸 Parásito Estelar', exp: rand(900, 1700), money: rand(140, 320) },
      { nombre: '🦠 Bestia de Plasma', exp: rand(1000, 1800), money: rand(160, 360) },
      { nombre: '🤖 Guardián Robótico', exp: rand(1200, 2100), money: rand(200, 430) },
      { nombre: '🪲 Insectoide Marciano', exp: rand(800, 1500), money: rand(120, 270) },
      { nombre: '🌡️ Criatura de Radiación', exp: rand(1050, 1900), money: rand(170, 390) },
      { nombre: '💫 Cazador Estelar', exp: rand(1150, 2050), money: rand(190, 420) },
    ],
    animalesRaros: [
      { nombre: '☄️ Titán Cósmico', exp: rand(3000, 5500), money: rand(650, 1200) },
      { nombre: '🌠 Dios Alienígena Primordial', exp: rand(4000, 7000), money: rand(800, 1600) },
      { nombre: '🚀 Comandante Alienígena', exp: rand(3500, 6000), money: rand(720, 1350) },
    ],
  },
  {
    nombre: '⚗️ Zona Mutante',
    intro: [
      'Ingresas a una zona de radiación extrema donde la vida mutó de formas imposibles...',
      'Criaturas que mezclan rasgos de distintas especies te observan con hambre...',
      'Un rugido que parece salir de varias gargantas a la vez rompe el silencio...',
      'El suelo está cubierto de sustancias fluorescentes y algo se arrastra detrás tuyo...',
    ],
    animalesComunes: [
      { nombre: '🧬 Oso Mutante Tricéfalo', exp: rand(1200, 2100), money: rand(190, 420) },
      { nombre: '🦖 Raptor Radioactivo', exp: rand(1100, 2000), money: rand(180, 400) },
      { nombre: '🕷️ Araña Colosal Mutante', exp: rand(1000, 1800), money: rand(160, 360) },
      { nombre: '🐊 Cocodrilo Blindado', exp: rand(1300, 2200), money: rand(210, 450) },
      { nombre: '🐺 Lobo de Dos Cabezas', exp: rand(1150, 2050), money: rand(185, 410) },
      { nombre: '🦏 Rinoceronte de Acero', exp: rand(1250, 2150), money: rand(200, 430) },
    ],
    animalesRaros: [
      { nombre: '☢️ El Abominable Mutante', exp: rand(3200, 5800), money: rand(680, 1250) },
      { nombre: '🧟 Híbrido Indestructible', exp: rand(2800, 5000), money: rand(600, 1100) },
      { nombre: '🔬 Experimento Omega', exp: rand(3500, 6200), money: rand(710, 1300) },
    ],
  },
  {
    nombre: '🏛️ Reino Antiguo',
    intro: [
      'Entre ruinas de una civilización perdida, algo que dormía ha despertado...',
      'Jeroglíficos en las paredes se iluminan cuando te acercas...',
      'El polvo de siglos se levanta y una presencia ancestral te rodea...',
      'Un sarcófago en el centro de la sala se mueve lentamente por sí solo...',
    ],
    animalesComunes: [
      { nombre: '🐈‍⬛ Gato de Bastet', exp: rand(700, 1400), money: rand(100, 250) },
      { nombre: '🦅 Halcón de Horus', exp: rand(900, 1600), money: rand(140, 300) },
      { nombre: '🐊 Cocodrilo de Sobek', exp: rand(1100, 1900), money: rand(170, 380) },
      { nombre: '🐍 Cobra Real de Apofis', exp: rand(1000, 1800), money: rand(160, 350) },
      { nombre: '💀 Momia Guerrera', exp: rand(950, 1750), money: rand(150, 330) },
      { nombre: '🦂 Escorpión de Isis', exp: rand(850, 1600), money: rand(130, 290) },
    ],
    animalesRaros: [
      { nombre: '🦁 Esfinge Guardiana', exp: rand(2500, 4500), money: rand(520, 980) },
      { nombre: '💀 Anubis Despertado', exp: rand(3500, 6000), money: rand(720, 1300) },
      { nombre: '🏛️ Ra Corrompido', exp: rand(3200, 5500), money: rand(680, 1250) },
    ],
  },
  {
    nombre: '🧊 Cripta Eterna',
    intro: [
      'Desciendes a una cripta donde la muerte misma tiene temperatura...',
      'Velas encendidas solas iluminan pasillos que no deberían existir...',
      'El susurro de mil almas te guía hacia lo más profundo de la oscuridad...',
      'Algo con muchos dientes sonríe desde la sombra al final del pasillo...',
    ],
    animalesComunes: [
      { nombre: '🧛 Vampiro Ancestral', exp: rand(1100, 2000), money: rand(180, 400) },
      { nombre: '🐺 Hombre Lobo', exp: rand(1000, 1800), money: rand(160, 360) },
      { nombre: '🕷️ Araña Necrófaga', exp: rand(900, 1700), money: rand(140, 320) },
      { nombre: '💀 Liche Menor', exp: rand(1200, 2100), money: rand(190, 420) },
      { nombre: '👻 Banshee Furiosa', exp: rand(950, 1750), money: rand(150, 340) },
    ],
    animalesRaros: [
      { nombre: '🦇 Señor de los Vampiros', exp: rand(3000, 5500), money: rand(640, 1200) },
      { nombre: '💀 El Rey Liche', exp: rand(4000, 7000), money: rand(820, 1550) },
      { nombre: '🌑 Dios de la Muerte Menor', exp: rand(3700, 6500), money: rand(780, 1450) },
    ],
  },
  {
    nombre: '🌸 Bosque Encantado',
    intro: [
      'Un bosque de árboles plateados te envuelve con música que nadie toca...',
      'Hadas malignas te siguen desde las ramas susurrando tu nombre...',
      'Los colores del bosque cambian y el camino de vuelta ha desaparecido...',
      'Una criatura hermosa y letal te sonríe desde el claro iluminado...',
    ],
    animalesComunes: [
      { nombre: '🧚 Hada Cazadora', exp: rand(800, 1500), money: rand(120, 280) },
      { nombre: '🦄 Unicornio Oscuro', exp: rand(1100, 1900), money: rand(170, 380) },
      { nombre: '🐺 Lobo Feérico', exp: rand(950, 1750), money: rand(145, 330) },
      { nombre: '🌿 Enredadera Viviente', exp: rand(750, 1400), money: rand(110, 260) },
      { nombre: '🦋 Mariposa Gigante Venenosa', exp: rand(700, 1300), money: rand(100, 240) },
    ],
    animalesRaros: [
      { nombre: '🌸 La Reina del Bosque', exp: rand(2800, 5000), money: rand(600, 1100) },
      { nombre: '🧙 El Archimago Bestia', exp: rand(3300, 5800), money: rand(700, 1300) },
      { nombre: '🦌 Ciervo de los Mil Años', exp: rand(2600, 4500), money: rand(560, 1050) },
    ],
  },
  {
    nombre: '🎭 Ciudad del Caos',
    intro: [
      'Una metrópolis donde el tiempo colapsa y dinosaurios comparten calle con robots...',
      'El caos absoluto reina: naves espaciales y dragones pelean en el cielo...',
      'Cada esquina que doblas te lleva a una época diferente de la historia...',
      'Escuchas un rugido jurásico mezclado con el zumbido de propulsores alienígenas...',
    ],
    animalesComunes: [
      { nombre: '🦖 Velocirraptor Urbano', exp: rand(1000, 1800), money: rand(160, 360) },
      { nombre: '🤖 Robot Asesino Modelo X', exp: rand(1100, 1900), money: rand(175, 390) },
      { nombre: '🧟 Zombie Apocalíptico', exp: rand(800, 1500), money: rand(120, 270) },
      { nombre: '👽 Invasor Intergaláctico', exp: rand(1050, 1850), money: rand(165, 375) },
      { nombre: '🦕 Braquiosaurio Mutante', exp: rand(1200, 2100), money: rand(195, 430) },
    ],
    animalesRaros: [
      { nombre: '🦖 T-Rex Cyborg', exp: rand(3500, 6000), money: rand(720, 1350) },
      { nombre: '🌀 El Señor del Caos', exp: rand(4200, 7500), money: rand(840, 1580) },
      { nombre: '🤖 IA Rebelde Suprema', exp: rand(3800, 6800), money: rand(790, 1480) },
    ],
  },
]

const monstruosDimensionales = [
  { nombre: '🌀 El Olvido Absoluto', exp: rand(5000, 9000), money: rand(1000, 2000) },
  { nombre: '👁️‍🗨️ Zagrath el Sin Forma', exp: rand(4500, 8000), money: rand(900, 1800) },
  { nombre: '🕳️ El Devorador de Estrellas', exp: rand(6000, 10000), money: rand(1100, 2200) },
  { nombre: '💀 Nyarlathotep Dimensional', exp: rand(5500, 9500), money: rand(1050, 2100) },
  { nombre: '🌑 Kronath el Eterno', exp: rand(4000, 7500), money: rand(850, 1700) },
  { nombre: '🔮 El Oráculo Carnívoro', exp: rand(4200, 7800), money: rand(880, 1750) },
  { nombre: '⚡ Zyx el Fulgor Caótico', exp: rand(4800, 8500), money: rand(950, 1900) },
  { nombre: '🌊 La Marea de Conciencias', exp: rand(5200, 9200), money: rand(1020, 2050) },
  { nombre: '🦠 El Parásito Universal', exp: rand(4600, 8200), money: rand(920, 1850) },
  { nombre: '🛸 Vaxis el Conquistador', exp: rand(5800, 9800), money: rand(1080, 2180) },
  { nombre: '🌌 El Vacío Consciente', exp: rand(6500, 11000), money: rand(1200, 2400) },
  { nombre: '🔱 Azazoth el Supremo', exp: rand(7000, 12000), money: rand(1300, 2600) },
  { nombre: '💫 El Tiempo Roto', exp: rand(5500, 9800), money: rand(1080, 2200) },
  { nombre: '🧿 El Ojo que Todo lo Ve', exp: rand(4800, 8800), money: rand(960, 1950) },
  { nombre: '🎭 El Actor del Fin', exp: rand(5300, 9400), money: rand(1030, 2080) },
]

const eventosEspeciales = [
  {
    prob: 0.05,
    perdidaPorcentaje: [0.25, 0.40],
    cooldown: [8, 14],
    textos: [
      (exp, money, espera) => `*💣 ¡TRAMPA EXPLOSIVA!*\n\nCaminabas confiado cuando una trampa oculta en el suelo te mandó volando.\nCuando despertaste, alguien ya había robado tus cosas.\n\n❌ *-${exp} EXP*\n❌ *-${money} Diamantes*\n\n⏳ Recuperación: *${espera} minutos*\n_"La próxima vez mira dónde pisas."_`,
      (exp, money, espera) => `*💥 ¡EMBOSCADA DE TRAMPERO!*\n\nOtro cazador más astuto preparó el área antes de que llegaras.\nTus pertenencias quedaron regadas en un radio de 20 metros.\n\n❌ *-${exp} EXP*\n❌ *-${money} Diamantes*\n\n⏳ Recuperación: *${espera} minutos*`,
    ],
  },
  {
    prob: 0.04,
    perdidaPorcentaje: [0.30, 0.50],
    cooldown: [10, 18],
    textos: [
      (exp, money, espera) => `*🌪️ ¡TORNADO DIMENSIONAL!*\n\nUn vórtice de energía pura se formó sin aviso y te tragó.\nApareciste a 3 kilómetros de donde estabas, sin nada encima.\n\n❌ *-${exp} EXP*\n❌ *-${money} Diamantes*\n\n⏳ Desorientación: *${espera} minutos*\n_"La naturaleza no perdona ni a los mejores."_`,
      (exp, money, espera) => `*⚡ ¡TORMENTA ELÉCTRICA SALVAJE!*\n\nUn rayo cayó a tus pies y el shock te dejó tirado por horas.\nCuando volviste en ti, tus recursos habían "evaporado".\n\n❌ *-${exp} EXP*\n❌ *-${money} Diamantes*\n\n⏳ Recuperación: *${espera} minutos*`,
    ],
  },
  {
    prob: 0.04,
    perdidaPorcentaje: [0.35, 0.55],
    cooldown: [12, 20],
    textos: [
      (exp, money, espera) => `*🗡️ ¡ROBO A MANO ARMADA!*\n\nCinco cazadores corruptos te rodearon y no tuviste opción.\n"La bolsa o la vida" dijeron. Elegiste la vida.\n\n❌ *-${exp} EXP*\n❌ *-${money} Diamantes*\n\n⏳ Trauma: *${espera} minutos*\n_"Denunciarlos no sirvió de nada, son los guardias del pueblo."_`,
      (exp, money, espera) => `*💀 ¡EMBOSCADA NOCTURNA!*\n\nEsperaron a que oscureciera para atacarte en grupo.\nNo pudiste ver ni de quién eran las manos que vaciaban tus bolsillos.\n\n❌ *-${exp} EXP*\n❌ *-${money} Diamantes*\n\n⏳ Recuperación: *${espera} minutos*`,
    ],
  },
  {
    prob: 0.03,
    perdidaPorcentaje: [0.45, 0.70],
    cooldown: [15, 25],
    textos: [
      (exp, money, espera) => `*🔮 ¡MALDICIÓN DE LA TUMBA!*\n\nTocaste un artefacto que no debías tocar.\nLa maldición consumió tu energía vital y tus riquezas se convirtieron en polvo.\n\n❌ *-${exp} EXP*\n❌ *-${money} Diamantes*\n\n⏳ Ritual de purificación: *${espera} minutos*\n_"Los tesoros malditos no son tesoros."_`,
      (exp, money, espera) => `*💀 ¡MALDICIÓN DE APOFIS!*\n\nUna serpiente de sombras emergió y te mordió el alma.\nTu fuerza y riqueza drenaron como agua entre tus dedos.\n\n❌ *-${exp} EXP*\n❌ *-${money} Diamantes*\n\n⏳ Exorcismo necesario: *${espera} minutos*\n_"Algunos males no se curan con vendas."_`,
    ],
  },
  {
    prob: 0.03,
    perdidaPorcentaje: [0.50, 0.75],
    cooldown: [18, 28],
    textos: [
      (exp, money, espera) => `*🌀 ¡COLAPSO DIMENSIONAL!*\n\nUn agujero de gusano se abrió bajo tus pies sin previo aviso.\nCaíste durante lo que parecieron horas antes de aterrizar en tu punto de origen... sin nada.\n\n❌ *-${exp} EXP*\n❌ *-${money} Diamantes*\n\n⏳ Reintegración: *${espera} minutos*\n_"El espacio-tiempo cobra su propio precio."_`,
    ],
  },
  {
    prob: 0.01,
    perdidaPorcentaje: [0.80, 0.90],
    cooldown: [25, 40],
    textos: [
      (exp, money, espera) => `*☄️ ¡EVENTO DE EXTINCIÓN!*\n\nUn meteorito dimensional del tamaño de una ciudad cayó exactamente donde estabas.\nLos rescatistas tardaron días en encontrarte bajo los escombros.\nPerdiste casi todo.\n\n❌ *-${exp} EXP*\n❌ *-${money} Diamantes*\n\n⏳ Reconstrucción de vida: *${espera} minutos*\n_"Al menos sobreviviste... ¿o era mejor lo contrario?"_`,
      (exp, money, espera) => `*🌑 ¡EL FIN CASI LLEGÓ!*\n\nTodos los monstruos del mundo se coaligaron y te eligieron como objetivo.\nCuando terminaron contigo, no quedaba ni el polvo de tus pertenencias.\n\n❌ *-${exp} EXP*\n❌ *-${money} Diamantes*\n\n⏳ Resurrección médica: *${espera} minutos*\n_"Hay días en que es mejor no salir de la cama."_`,
      (exp, money, espera) => `*💥 ¡APOCALIPSIS PERSONAL!*\n\nNo una sino CINCO criaturas legendarias te encontraron al mismo tiempo.\nCada una se llevó un trozo de tu dignidad y tus recursos.\n\n❌ *-${exp} EXP*\n❌ *-${money} Diamantes*\n\n⏳ Recuperación del ego: *${espera} minutos*\n_"Esto no se lo cuentes a nadie en el gremio."_`,
    ],
  },
]

const textosExito = [
  (mundo, animal) => `*🎯 ¡MISIÓN CUMPLIDA!*\n\n🌍 Mundo: *${mundo}*\n\nTras una batalla épica lograste derrotar al temible *${animal.nombre}*.\nLos aldeanos cercanos celebran tu hazaña con fuegos artificiales.\n\n✨ *+${animal.exp} EXP*\n💎 *+${animal.money} Diamantes*\n\n_"El que caza con paciencia, regresa con gloria."_`,
  (mundo, animal) => `*⚔️ ¡VICTORIA GLORIOSA!*\n\n🌍 Mundo: *${mundo}*\n\n*${animal.nombre}* cayó ante tu destreza.\nEncontraste una reliquia valiosa entre sus pertenencias.\n\n✨ *+${animal.exp} EXP*\n💎 *+${animal.money} Diamantes*\n\n_¡Eres una leyenda en este mundo!_`,
  (mundo, animal) => `*🏆 ¡CAZADOR SUPREMO!*\n\n🌍 Mundo: *${mundo}*\n\nEl *${animal.nombre}* era considerado imposible de vencer... hasta hoy.\nTu nombre quedará grabado en las crónicas de este mundo.\n\n✨ *+${animal.exp} EXP*\n💎 *+${animal.money} Diamantes*`,
  (mundo, animal) => `*🌟 ¡INCREÍBLE!*\n\n🌍 Mundo: *${mundo}*\n\nDerrotaste al *${animal.nombre}* sin sudar una gota.\nHasta los dioses de este mundo te hacen una reverencia.\n\n✨ *+${animal.exp} EXP*\n💎 *+${animal.money} Diamantes*\n\n_¡Regresa pronto, héroe!_`,
  (mundo, animal) => `*🎊 ¡EL PUEBLO TE ACLAMA!*\n\n🌍 Mundo: *${mundo}*\n\nEl *${animal.nombre}* aterrorizaba esta región hace décadas.\nHoy tú pusiste fin a esa pesadilla.\n\n✨ *+${animal.exp} EXP*\n💎 *+${animal.money} Diamantes*\n\n_¡Tu estatua ya está en construcción en la plaza!_`,
  (mundo, animal) => `*🗡️ ¡CAZA PERFECTA!*\n\n🌍 Mundo: *${mundo}*\n\nEl *${animal.nombre}* no tuvo ni tiempo de reaccionar.\nTu técnica fue tan precisa que los otros animales huyeron de miedo.\n\n✨ *+${animal.exp} EXP*\n💎 *+${animal.money} Diamantes*\n\n_¡Un golpe, una victoria!_`,
  (mundo, animal) => `*🔥 ¡LEYENDA VIVIENTE!*\n\n🌍 Mundo: *${mundo}*\n\nBardos ya cantan canciones sobre tu pelea con el *${animal.nombre}*.\nY la batalla terminó hace solo 5 minutos.\n\n✨ *+${animal.exp} EXP*\n💎 *+${animal.money} Diamantes*\n\n_¡Vuelve pronto, el mundo necesita héroes como tú!_`,
]

const textosDerrota = [
  (mundo, animal, perdExp, perdMoney, espera) => `*💀 ¡DERROTA APLASTANTE!*\n\n🌍 Mundo: *${mundo}*\n\nEl *${animal.nombre}* te mandó de vuelta al pueblo de una sola dentellada.\nLos curanderos tardaron horas en reparar tus huesos.\n\n❌ *-${perdExp} EXP*\n❌ *-${perdMoney} Diamantes*\n\n⏳ Recuperación: *${espera} minutos*\n_"No toda caza termina en gloria..."_`,
  (mundo, animal, perdExp, perdMoney, espera) => `*🏥 ¡HOSPITALIZACIÓN DE EMERGENCIA!*\n\n🌍 Mundo: *${mundo}*\n\nEl *${animal.nombre}* te dejó inconsciente entre los arbustos.\nUn aldeano te encontró al amanecer y te llevó a curar.\n\n❌ *-${perdExp} EXP*\n❌ *-${perdMoney} Diamantes*\n\n⏳ Espera: *${espera} minutos* para recuperarte\n_¡La próxima vez ve con más cuidado!_`,
  (mundo, animal, perdExp, perdMoney, espera) => `*😵 ¡TE APLASTARON!*\n\n🌍 Mundo: *${mundo}*\n\nEl *${animal.nombre}* resultó ser demasiado para ti esta vez.\nTus compañeros de gremio te recogieron del suelo.\n\n❌ *-${perdExp} EXP*\n❌ *-${perdMoney} Diamantes*\n\n⏳ Tiempo de descanso: *${espera} minutos*\n_¡Vuelve más fuerte!_`,
  (mundo, animal, perdExp, perdMoney, espera) => `*🚑 ¡RESCATE DE EMERGENCIA!*\n\n🌍 Mundo: *${mundo}*\n\nEl *${animal.nombre}* te hizo volar por los aires como muñeco de trapo.\nUn helicóptero de rescate tuvo que sacarte de la zona.\n\n❌ *-${perdExp} EXP*\n❌ *-${perdMoney} Diamantes*\n\n⏳ Recuperación médica: *${espera} minutos*\n_"Hasta el mejor cazador cae alguna vez."_`,
  (mundo, animal, perdExp, perdMoney, espera) => `*⚡ ¡EMBOSCADA FATAL!*\n\n🌍 Mundo: *${mundo}*\n\nEl *${animal.nombre}* te tendió una trampa y caíste como novato.\nPerdiste todo tu equipo y tuvieron que prestarte ropa del hospital.\n\n❌ *-${perdExp} EXP*\n❌ *-${perdMoney} Diamantes*\n\n⏳ Tiempo de recuperación: *${espera} minutos*`,
  (mundo, animal, perdExp, perdMoney, espera) => `*🩸 ¡DRENADO DE PODER!*\n\n🌍 Mundo: *${mundo}*\n\nEl *${animal.nombre}* no te comió... te absorbió lentamente.\nSentiste cómo tu fuerza y dinero se evaporaban con cada segundo.\n\n❌ *-${perdExp} EXP*\n❌ *-${perdMoney} Diamantes*\n\n⏳ Regeneración: *${espera} minutos*\n_"Algunos ataques no dejan marcas visibles."_`,
  (mundo, animal, perdExp, perdMoney, espera) => `*🤕 ¡HUMILLACIÓN PÚBLICA!*\n\n🌍 Mundo: *${mundo}*\n\nEl *${animal.nombre}* te venció tan rápido que hasta los niños del pueblo se rieron.\nUno de ellos te grabó y ya es viral en los pergaminos de noticias.\n\n❌ *-${perdExp} EXP*\n❌ *-${perdMoney} Diamantes*\n\n⏳ Recuperación del ego: *${espera} minutos*\n_"No lo superas ni con terapia."_`,
]

const textosMonstruoExito = [
  (nombre, exp, money) => `*🌀 ¡ALERTA DIMENSIONAL SUPERADA!*\n\nUn portal se abrió ante ti y emergió *${nombre}*.\nSus rugidos hicieron temblar la realidad misma.\nConvocaste toda tu energía y lo devolviste a su dimensión.\n\n✨ *+${exp} EXP*\n💎 *+${money} Diamantes*\n\n🏆 _¡Eres el primer cazador en derrotar a este ser en todo el multiverso!_`,
  (nombre, exp, money) => `*👾 ¡INVASIÓN RECHAZADA!*\n\n*${nombre}* llegó desde otra galaxia para conquistar este mundo.\nTú fuiste su primer... y último obstáculo.\n\n✨ *+${exp} EXP*\n💎 *+${money} Diamantes*\n\n🌟 _¡Los noticiarios de 3 galaxias hablarán de tu hazaña!_`,
  (nombre, exp, money) => `*⚔️ ¡EL ELEGIDO DEMOSTRÓ SU VALOR!*\n\n*${nombre}* existía desde antes de que este universo naciera.\nHoy, un cazador como tú lo mandó a dormir eternamente.\n\n✨ *+${exp} EXP*\n💎 *+${money} Diamantes*\n\n👑 _¡Los dioses de este mundo te deben la existencia!_`,
  (nombre, exp, money) => `*🌌 ¡PROTECTOR DEL MULTIVERSO!*\n\n*${nombre}* había destruido 12 dimensiones antes de llegar a la tuya.\nTú detuviste la cadena con tus propias manos.\n\n✨ *+${exp} EXP*\n💎 *+${money} Diamantes*\n\n🌟 _¡El Consejo Dimensional te concede el título de Guardián Supremo!_`,
]

const textosMonstruoDerrota = [
  (nombre, perdExp, perdMoney, espera) => `*🌑 ¡ABSORBIDO POR LA OSCURIDAD!*\n\n*${nombre}* te tragó entero y te escupió medio muerto en tu dimensión de origen.\nLos médicos tardaron 3 días en descifrar qué tenías.\n\n❌ *-${perdExp} EXP*\n❌ *-${perdMoney} Diamantes*\n\n⏳ Recuperación dimensional: *${espera} minutos*\n_"Hay seres que no deberían ser cazados..."_`,
  (nombre, perdExp, perdMoney, espera) => `*💥 ¡ANIQUILADO EN EL PLANO ASTRAL!*\n\n*${nombre}* te destruyó en todas las dimensiones simultáneamente.\nTu alma tardó horas en volver al cuerpo.\n\n❌ *-${perdExp} EXP*\n❌ *-${perdMoney} Diamantes*\n\n⏳ Tiempo de reensamblado: *${espera} minutos*\n_¡Ese ser está totalmente fuera de tu liga!_`,
  (nombre, perdExp, perdMoney, espera) => `*👁️ ¡CONSUMIDO POR EL VACÍO!*\n\n*${nombre}* ni siquiera se molestó en atacarte.\nSimplemente te miró y caíste del miedo.\nDespertaste en el hospital 4 horas después sin saber tu nombre.\n\n❌ *-${perdExp} EXP*\n❌ *-${perdMoney} Diamantes*\n\n⏳ Terapia dimensional: *${espera} minutos*\n_"Algunos monstruos no se cazan, se evitan a toda costa."_`,
  (nombre, perdExp, perdMoney, espera) => `*🕳️ ¡BORRADO DE LA EXISTENCIA MOMENTÁNEAMENTE!*\n\n*${nombre}* decidió que no merecías existir por unos minutos.\nTe restauró solo porque le dio lástima.\nTus recursos no tuvieron la misma suerte.\n\n❌ *-${perdExp} EXP*\n❌ *-${perdMoney} Diamantes*\n\n⏳ Re-existencia: *${espera} minutos*\n_"Agradece que te devolvió."_`,
  (nombre, perdExp, perdMoney, espera) => `*☠️ ¡DRENADO HASTA EL ÚLTIMO ÁTOMO!*\n\n*${nombre}* se alimentó de tu experiencia de vida y de cada moneda que ganaste con esfuerzo.\nEres literalmente una cáscara vacía ahora mismo.\n\n❌ *-${perdExp} EXP*\n❌ *-${perdMoney} Diamantes*\n\n⏳ Recuperación existencial: *${espera} minutos*\n_"Ni el 10% que sobró fue tuyo por elección."_`,
]

function getCooldownMs(tipo) {
  if (tipo === 'monstruo_win') return rand(12, 20) * 60 * 1000
  if (tipo === 'raro_win') return rand(7, 12) * 60 * 1000
  if (tipo === 'comun_win') return COOLDOWN_BASE
  if (tipo === 'monstruo_lose') return rand(20, 35) * 60 * 1000
  if (tipo === 'raro_lose') return rand(12, 20) * 60 * 1000
  if (tipo === 'comun_lose') return rand(5, 9) * 60 * 1000
  return COOLDOWN_BASE
}

const handler = async (m, { conn }) => {
  const id = m.sender
  const now = Date.now()

  if (cooldowns[id] && now - cooldowns[id].tiempo < cooldowns[id].duracion) {
    const msRestante = cooldowns[id].duracion - (now - cooldowns[id].tiempo)
    const minutosRestantes = Math.ceil(msRestante / 60000)
    const segundosRestantes = Math.ceil(msRestante / 1000)

    if (msRestante < 60000) {
      return m.reply(`⏳ Casi listo... espera *${segundosRestantes} segundo(s)* más antes de cazar.`)
    }

    const mensajesEspera = [
      `⏳ Aún estás recuperándote. Vuelve en *${minutosRestantes} minuto(s)*.`,
      `🏥 Los médicos no te dan el alta todavía. *${minutosRestantes} minuto(s)* más.`,
      `😴 Tu cazador aún está durmiendo el golpe. *${minutosRestantes} minuto(s)* restantes.`,
      `🩹 Tus heridas necesitan *${minutosRestantes} minuto(s)* más para sanar.`,
      `🌀 El portal dimensional sigue inestable. Espera *${minutosRestantes} minuto(s)*.`,
      `💀 Estás técnicamente vivo pero necesitas *${minutosRestantes} minuto(s)* para confirmarlo.`,
      `🛌 El curandero dice que si sales antes de *${minutosRestantes} minuto(s)* no responde por las consecuencias.`,
    ]

    return m.reply(pick(mensajesEspera))
  }

  let stats = { exp: 1000, money: 500 }
  try {
    stats = getUserStats(id) || stats
  } catch (_) {}

  const mundoActual = pick(mundos)
  const introTexto = pick(mundoActual.intro)

  for (const evento of eventosEspeciales) {
    if (Math.random() < evento.prob) {
      const pct = rand(evento.perdidaPorcentaje[0] * 100, evento.perdidaPorcentaje[1] * 100) / 100
      const perdida = calcularPerdida(stats, pct)
      removeExp(id, perdida.exp)
      removeMoney(id, perdida.money)
      const espera = rand(evento.cooldown[0], evento.cooldown[1])
      cooldowns[id] = { tiempo: now, duracion: espera * 60 * 1000 }
      saveCooldowns()
      return m.reply(`_${introTexto}_\n\n${pick(evento.textos)(perdida.exp, perdida.money, espera)}`)
    }
  }

  const tiradaMonstruo = Math.random()
  const tiradaRaro = Math.random()

  let objetivo
  let tipoObjetivo

  if (tiradaMonstruo < 0.04) {
    objetivo = pick(monstruosDimensionales)
    tipoObjetivo = 'monstruo_dimensional'
  } else if (tiradaRaro < 0.1) {
    objetivo = pick(mundoActual.animalesRaros)
    tipoObjetivo = 'raro'
  } else {
    objetivo = pick(mundoActual.animalesComunes)
    tipoObjetivo = 'comun'
  }

  let tasaExito = 0.80
  if (tipoObjetivo === 'monstruo_dimensional') tasaExito = 0.30
  if (tipoObjetivo === 'raro') tasaExito = 0.50

  const exito = Math.random() < tasaExito

  if (exito) {
    addExp(id, objetivo.exp)
    addMoney(id, objetivo.money)

    let tipoCooldown = 'comun_win'
    if (tipoObjetivo === 'monstruo_dimensional') tipoCooldown = 'monstruo_win'
    else if (tipoObjetivo === 'raro') tipoCooldown = 'raro_win'

    cooldowns[id] = { tiempo: now, duracion: getCooldownMs(tipoCooldown) }
    saveCooldowns()

    let mensaje
    if (tipoObjetivo === 'monstruo_dimensional') {
      mensaje = pick(textosMonstruoExito)(objetivo.nombre, objetivo.exp, objetivo.money)
    } else {
      mensaje = pick(textosExito)(mundoActual.nombre, objetivo)
    }

    return m.reply(`_${introTexto}_\n\n${mensaje}`)

  } else {
    let pctPerdida
    let tipoCooldown

    if (tipoObjetivo === 'monstruo_dimensional') {
      pctPerdida = rand(55, 90) / 100
      tipoCooldown = 'monstruo_lose'
    } else if (tipoObjetivo === 'raro') {
      pctPerdida = rand(25, 55) / 100
      tipoCooldown = 'raro_lose'
    } else {
      pctPerdida = rand(10, 35) / 100
      tipoCooldown = 'comun_lose'
    }

    const perdida = calcularPerdida(stats, pctPerdida)
    removeExp(id, perdida.exp)
    removeMoney(id, perdida.money)

    const duracion = getCooldownMs(tipoCooldown)
    cooldowns[id] = { tiempo: now, duracion }
    saveCooldowns()

    const minutosEspera = Math.ceil(duracion / 60000)

    let mensaje
    if (tipoObjetivo === 'monstruo_dimensional') {
      mensaje = pick(textosMonstruoDerrota)(objetivo.nombre, perdida.exp, perdida.money, minutosEspera)
    } else {
      mensaje = pick(textosDerrota)(mundoActual.nombre, objetivo, perdida.exp, perdida.money, minutosEspera)
    }

    return m.reply(`_${introTexto}_\n\n${mensaje}`)
  }
}

handler.help = ['cazar']
handler.tags = ['aventura']
handler.command = /^cazar$/i

export default handler