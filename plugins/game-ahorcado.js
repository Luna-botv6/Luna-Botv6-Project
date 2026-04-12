import { addExp } from '../lib/ahorcado.js'

const HANGMAN_PICS = [
  `
   +---+
   |   |
       |
       |
       |
       |
  =========`, `
   +---+
   |   |
   O   |
       |
       |
       |
  =========`, `
   +---+
   |   |
   O   |
   |   |
       |
       |
  =========`, `
   +---+
   |   |
   O   |
  /|   |
       |
       |
  =========`, `
   +---+
   |   |
   O   |
  /|\\  |
       |
       |
  =========`, `
   +---+
   |   |
   O   |
  /|\\  |
  /    |
       |
  =========`, `
   +---+
   |   |
   O   |
  /|\\  |
  / \\  |
       |
  =========`
]

const palabras = {
  facil: [
    'perro', 'gato', 'pan', 'luz', 'rojo', 'casa', 'sol', 'flor',
    'agua', 'mar', 'rio', 'mesa', 'silla', 'libro', 'papel', 'lapis',
    'mano', 'pie', 'ojo', 'nariz', 'boca', 'cara', 'pelo', 'piel',
    'amor', 'paz', 'fe', 'vida', 'alma', 'cielo', 'tierra', 'luna',
    'auto', 'tren', 'avion', 'barco', 'bici', 'cama', 'sofa', 'puerta',
    'leche', 'carne', 'huevo', 'queso', 'arroz', 'papa', 'tomate', 'cebolla',
    'rojo', 'azul', 'verde', 'negro', 'blanco', 'gris', 'rosa', 'oro',
    'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho',
    'mama', 'papa', 'hijo', 'hija', 'tio', 'tia', 'primo', 'nieto',
    'perla', 'anillo', 'reloj', 'bolso', 'gorra', 'botas', 'camisa', 'falda',
    'llave', 'porta', 'vaso', 'plato', 'cuchara', 'tenedor', 'cuchillo', 'olla',
    'taza', 'jarra', 'copa', 'botella', 'lata', 'bolsa', 'caja', 'sobre',
    'sal', 'azucar', 'cafe', 'te', 'jugo', 'sopa', 'torta', 'pastel',
    'rey', 'reina', 'principe', 'duque', 'conde', 'baron', 'lord', 'dama',
    'ala', 'pico', 'pluma', 'nido', 'cola', 'garra', 'pata', 'cuerno',
    'hora', 'dia', 'mes', 'año', 'siglo', 'epoca', 'era', 'tiempo',
    'norte', 'sur', 'este', 'oeste', 'arriba', 'abajo', 'dentro', 'fuera',
    'calor', 'frio', 'lluvia', 'nieve', 'viento', 'niebla', 'tormenta', 'rayo',
    'oro', 'plata', 'cobre', 'hierro', 'bronce', 'acero', 'aluminio', 'zinc',
    'risa', 'llanto', 'grito', 'susurro', 'canto', 'silbido', 'ronquido', 'bostezo',
    'barba', 'bigote', 'ceja', 'pestaña', 'diente', 'lengua', 'labio', 'mejilla',
    'brazo', 'codo', 'muñeca', 'dedo', 'uña', 'pierna', 'rodilla', 'tobillo',
    'corazon', 'pulmon', 'higado', 'riñon', 'hueso', 'musculo', 'vena', 'arteria',
    'calle', 'plaza', 'parque', 'jardin', 'bosque', 'selva', 'pradera', 'valle',
    'monte', 'colina', 'cerro', 'pico', 'cumbre', 'ladera', 'barranco', 'cueva'
  ],
  medio: [
    'coche', 'silla', 'escuela', 'calle', 'pelota', 'cuadro', 'ventana',
    'bosque', 'montaña', 'desierto', 'playa', 'jardin', 'parque', 'campo', 'pradera',
    'elefante', 'jirafa', 'tigre', 'leon', 'zebra', 'oso', 'lobo', 'zorro',
    'teclado', 'raton', 'pantalla', 'camara', 'telefono', 'tablet', 'radio', 'consola',
    'guitarra', 'piano', 'violin', 'flauta', 'bateria', 'trompeta', 'saxofon', 'arpa',
    'futbol', 'baloncesto', 'tenis', 'voleibol', 'natacion', 'atletismo', 'boxeo', 'karate',
    'doctor', 'maestro', 'ingeniero', 'abogado', 'policia', 'bombero', 'chef', 'piloto',
    'primavera', 'verano', 'otoño', 'invierno', 'enero', 'febrero', 'marzo', 'abril',
    'felicidad', 'tristeza', 'alegria', 'miedo', 'enojo', 'sorpresa', 'calma', 'energia',
    'diamante', 'esmeralda', 'zafiro', 'rubi', 'topacio', 'amatista', 'jade', 'coral',
    'tortuga', 'conejo', 'ardilla', 'pajaro', 'pinguino', 'delfin', 'pulpo', 'cangrejo',
    'ciruela', 'durazno', 'manzana', 'pera', 'uva', 'sandia', 'melon', 'kiwi',
    'hospital', 'farmacia', 'biblioteca', 'museo', 'teatro', 'cine', 'estadio', 'gimnasio',
    'mercado', 'tienda', 'almacen', 'boutique', 'fruteria', 'panaderia', 'carniceria', 'pescaderia',
    'camion', 'autobus', 'taxi', 'bicicleta', 'motocicleta', 'helicoptero', 'submarino', 'yate',
    'sarten', 'cacerola', 'bandeja', 'colador', 'rallador', 'batidora', 'tostadora', 'horno',
    'cortina', 'alfombra', 'espejo', 'lampara', 'almohada', 'sabana', 'manta', 'edredon',
    'escritorio', 'estanteria', 'armario', 'cajon', 'percha', 'repisa', 'taburete', 'mecedora',
    'delfin', 'ballena', 'tiburon', 'medusa', 'estrella', 'caballito', 'langosta', 'camaron',
    'aguila', 'halcon', 'buho', 'cuervo', 'paloma', 'perico', 'tucano', 'colibri',
    'serpiente', 'lagarto', 'cocodrilo', 'iguana', 'camaleon', 'salamandra', 'gecko', 'dragon',
    'hormiga', 'abeja', 'mariposa', 'libélula', 'mosquito', 'escarabajo', 'grillo', 'cigarra',
    'fresa', 'frambuesa', 'mora', 'arandano', 'cereza', 'platano', 'naranja', 'limon',
    'lechuga', 'espinaca', 'brocoli', 'coliflor', 'zanahoria', 'pepino', 'rabano', 'nabo',
    'planeta', 'estrella', 'galaxia', 'cometa', 'asteroide', 'satelite', 'orbita', 'eclipse',
    'tormenta', 'huracan', 'tornado', 'terremoto', 'tsunami', 'avalancha', 'erupcion', 'incendio',
    'castillo', 'palacio', 'fortaleza', 'torre', 'muralla', 'puente', 'tunel', 'acueducto',
    'espada', 'lanza', 'arco', 'flecha', 'escudo', 'armadura', 'casco', 'hacha',
    'corona', 'cetro', 'trono', 'manto', 'collar', 'pulsera', 'brazalete', 'pendiente',
    'violin', 'violonchelo', 'contrabajo', 'mandolina', 'banjo', 'ukelele', 'laud', 'clavecin'
  ],
  dificil: [
    'murcielago', 'javascript', 'universo', 'computadora', 'matematicas', 'desarrollador', 'revolucion',
    'arqueologia', 'biodiversidad', 'caleidoscopio', 'democracia', 'electroencefalograma', 'fotosintesis', 'geopolitica',
    'hipopotamo', 'idiosincrasia', 'jurisprudencia', 'kilogramo', 'logaritmo', 'metamorfosis', 'neurociencia',
    'oftalmologia', 'paleontologia', 'quimica', 'rehabilitacion', 'sincronizacion', 'tecnologia', 'ultrasonido',
    'veterinaria', 'wavelength', 'xenofobia', 'yacimiento', 'zoologia', 'abstracto', 'bibliografia', 'climatologia',
    'dermatologia', 'ecosistema', 'filosofia', 'gastronomia', 'hemisferio', 'iconografia', 'jerarquia', 'kirchnerismo',
    'licuadora', 'magnitud', 'nomenclatura', 'optimizacion', 'paradigma', 'cuarentena', 'refrigerador', 'simultaneo',
    'tuberculosis', 'urbanizacion', 'virtualizacion', 'whisky', 'xilofono', 'yacuzzi', 'zigzag', 'arquitectura',
    'burocratico', 'caracteristica', 'descentralizacion', 'especializacion', 'fluctuacion', 'globalizacion', 'heterogeneo',
    'implementacion', 'justificacion', 'kilovatio', 'liberalizacion', 'municipalidad', 'nacionalismo', 'obsolescencia',
    'parametro', 'quinquenio', 'reivindicacion', 'supermercado', 'traumatologia', 'urticaria', 'ventilacion', 'wordperfect',
    'exportacion', 'yoquepierdoismo', 'zanahoria', 'abecedario', 'bicentenario', 'controversial', 'desafortunadamente', 'estereotipo',
    'fotografia', 'gigabyte', 'hiperactividad', 'incandescente', 'jurisdiccion', 'kilometraje', 'luminosidad', 'magnificencia',
    'extraordinario', 'imprescindible', 'espectacular', 'incomprensible', 'contradictorio', 'innecesario', 'desproporcionado', 'inconfundible',
    'tranquilizante', 'desconcertante', 'irreversible', 'inconsecuente', 'desastroso', 'inquebrantable', 'indescriptible', 'irrecuperable',
    'democratizacion', 'industrializacion', 'modernizacion', 'privatizacion', 'nacionalizacion', 'secularizacion', 'estandarizacion', 'profesionalizacion',
    'autocritica', 'autoestima', 'autodisciplina', 'autodefensa', 'autoevaluacion', 'autobiografia', 'autofinanciacion', 'autogestion',
    'microorganismo', 'microeconomia', 'microprocesador', 'microscopio', 'microondas', 'microfono', 'microchip', 'microbios',
    'macroeconomia', 'macronutriente', 'macrocosmos', 'macrofotografia', 'macroevolucion', 'macroestructura', 'macromolecula', 'macroregion',
    'psicologia', 'psiquiatria', 'psicoanalisis', 'psicoterapia', 'psicopata', 'psicomotriz', 'psicologo', 'psicosis',
    'neurologia', 'neurona', 'neurotransmisor', 'neuroplasticidad', 'neurocirujano', 'neurodegenerativo', 'neuropsicologo', 'neurofisiologia',
    'cardiovascular', 'cardiologo', 'cardiologia', 'cardiaco', 'cardiograma', 'cardiopatia', 'cardioversion', 'cardiorrespiratorio',
    'gastroenterologia', 'gastrointestinal', 'gastroplastia', 'gastroscopia', 'gastroenteritis', 'gastronomico', 'gastroparesia', 'gastroduodenal',
    'otorrinolaringologo', 'otorrinolaringologia', 'otorragia', 'otoscopia', 'otomicosis', 'otorrea', 'ototoxicidad', 'otoplastia',
    'endocrinologia', 'endocrinologo', 'endoscopico', 'endoscopia', 'endometriosis', 'endogeno', 'endodoncia', 'endovenoso',
    'inmunologia', 'inmunidad', 'inmunizacion', 'inmunodeficiencia', 'inmunosupresor', 'inmunoglobulina', 'inmunoterapia', 'inmunodeprimido',
    'epidemiologia', 'epidemia', 'epidemico', 'epidermis', 'epidural', 'epidiascopio', 'epididimo', 'epifania',
    'anestesiologia', 'anestesiologo', 'anestesico', 'anestesia', 'anestesiado', 'anestesista', 'anestesiar', 'anestesiante',
    'hematologia', 'hematologo', 'hematoma', 'hematopoiesis', 'hematuria', 'hematocrito', 'hematies', 'hematopoyetico',
    'oftalmoscopio', 'oftalmoplejia', 'oftalmopatia', 'oftalmoscopia', 'oftalmica', 'oftalmico', 'oftalmopeda', 'oftalmoplegia',
    'traumatismo', 'traumatico', 'traumatizar', 'traumatizante', 'traumatologo', 'traumatoide', 'traumatizacion', 'traumatogenico',
    'radioactividad', 'radiofrecuencia', 'radiografia', 'radiologia', 'radiologo', 'radioterapia', 'radiodifusion', 'radiotelefono',
    'ultravioleta', 'ultratumba', 'ultramar', 'ultramontano', 'ultramundano', 'ultramoderno', 'ultranacionalista', 'ultraconservador',
    'infraestructura', 'infrarojo', 'infrahumano', 'infravalorar', 'infrautilizar', 'infradesarrollo', 'infraccion', 'infractor',
    'superconductor', 'superficial', 'superhombre', 'supermercado', 'superpoblacion', 'superpotencia', 'superproduccion', 'supersticioso',
    'intercontinental', 'interconexion', 'interdisciplinario', 'interesante', 'interferencia', 'intergalactico', 'internacional', 'interpersonal',
    'extraordinariamente', 'desproporcionadamente', 'inconmensurablemente', 'incomprensiblemente', 'contraproducente', 'imprescindiblemente', 'inexplicablemente', 'irremediablemente',
    'anticonstitucionalmente', 'electrocardiograma', 'contrainteligencia', 'constantinopolitano', 'interdisciplinariedad', 'otorrinolaringologia', 'desoxirribonucleico', 'inmunodeficiencia',
    'telecommunicaciones', 'responsabilidad', 'extraordinariedad', 'internacionalizacion', 'institucionalizar', 'intelectualidad', 'instrumentalizacion', 'intercomunicacion',
    'esternocleidomastoideo', 'hipopotomonstrosesquipedaliofobia', 'paralelepipedo', 'electroencefalografista', 'inconstitucionalidad', 'desproporcionalidad', 'ininteligibilidad', 'hipermegasupercalifragilistico'
  ]
}

async function handler(m, { conn, args, usedPrefix, command }) {
  conn.hangman = conn.hangman || {}
  const id = m.chat
  
  if (!conn.hangman[id]) {
    let dificultad = (args[0] || '').toLowerCase()
    if (!['facil', 'medio', 'dificil'].includes(dificultad)) {
      return m.reply(`Elige una dificultad para empezar:
*${usedPrefix + command} facil*
*${usedPrefix + command} medio*
*${usedPrefix + command} dificil*`)
    }
    
    let lista = palabras[dificultad]
    let palabra = lista[Math.floor(Math.random() * lista.length)]
    
    conn.hangman[id] = {
      palabra,
      letras: [],
      intentos: 6,
      mostrar: palabra.replace(/./g, '_'),
      dificultad
    }
    
    return m.reply(`¡Nuevo juego del ahorcado iniciado!
Dificultad: *${dificultad.toUpperCase()}*
${HANGMAN_PICS[0]}
Palabra: ${conn.hangman[id].mostrar.split('').join(' ')}
Escribe una letra con:
*${usedPrefix + command} <letra>*`)
  }
  
  const juego = conn.hangman[id]
  
  if (!args[0] || args[0].length !== 1 || !/[a-zñ]/i.test(args[0])) {
    return m.reply(`Debes escribir una sola letra. Ejemplo:\n*${usedPrefix + command} a*`)
  }
  
  const letra = args[0].toLowerCase()
  
  if (juego.letras.includes(letra)) {
    return m.reply(`Ya escribiste la letra *${letra}*. Prueba con otra.`)
  }
  
  juego.letras.push(letra)
  
  if (juego.palabra.includes(letra)) {
    let nuevaMostrar = ''
    for (let i = 0; i < juego.palabra.length; i++) {
      nuevaMostrar += juego.letras.includes(juego.palabra[i]) ? juego.palabra[i] : '_'
    }
    juego.mostrar = nuevaMostrar
    
    if (!juego.mostrar.includes('_')) {
      let expGanada = juego.dificultad === 'facil' ? 50 : juego.dificultad === 'medio' ? 100 : 200
      addExp(m.sender, expGanada)
      delete conn.hangman[id]
      return m.reply(`¡Felicidades! Adivinaste la palabra: *${juego.palabra}*
Ganaste *+${expGanada} EXP*`)
    } else {
      return m.reply(`¡Bien! La letra *${letra}* está en la palabra.
${HANGMAN_PICS[6 - juego.intentos]}
Palabra: ${juego.mostrar.split('').join(' ')}
Letras usadas: ${juego.letras.join(', ')}
Intentos restantes: ${juego.intentos}`)
    }
  } else {
    juego.intentos--
    
    if (juego.intentos <= 0) {
      const palabraFinal = juego.palabra
      const dibujoFinal = HANGMAN_PICS[6]
      delete conn.hangman[id]
      return m.reply(`${dibujoFinal}
¡Perdiste! La palabra era: *${palabraFinal}*`)
    } else {
      return m.reply(`La letra *${letra}* no está en la palabra.
${HANGMAN_PICS[6 - juego.intentos]}
Palabra: ${juego.mostrar.split('').join(' ')}
Letras usadas: ${juego.letras.join(', ')}
Intentos restantes: ${juego.intentos}`)
    }
  }
}

handler.command = /^ahorcado$/i
export default handler