import { join, dirname } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { setupMaster, fork } from 'cluster';
import cfonts from 'cfonts';
import readline from 'readline';
import yargs from 'yargs';
import chalk from 'chalk';
import fs from 'fs';
import './config.js'; //max update 2025

// Importación mejorada de Baileys con manejo de errores
let PHONENUMBER_MCC = {};
try {
  const baileys = await import('@whiskeysockets/baileys');
  PHONENUMBER_MCC = baileys.PHONENUMBER_MCC || baileys.default?.PHONENUMBER_MCC || {};
} catch (error) {
  console.warn(chalk.yellowBright('⚠ No se pudo importar PHONENUMBER_MCC de Baileys, usando validación básica'));
}

// Códigos de país más comunes como fallback
const FALLBACK_COUNTRY_CODES = {
  '1': 'US/CA',     // Estados Unidos y Canadá
  '7': 'RU/KZ',     // Rusia y Kazajistán
  '20': 'EG',       // Egipto
  '27': 'ZA',       // Sudáfrica
  '30': 'GR',       // Grecia
  '31': 'NL',       // Países Bajos
  '32': 'BE',       // Bélgica
  '33': 'FR',       // Francia
  '34': 'ES',       // España
  '36': 'HU',       // Hungría
  '39': 'IT',       // Italia
  '40': 'RO',       // Rumania
  '41': 'CH',       // Suiza
  '43': 'AT',       // Austria
  '44': 'GB',       // Reino Unido
  '45': 'DK',       // Dinamarca
  '46': 'SE',       // Suecia
  '47': 'NO',       // Noruega
  '48': 'PL',       // Polonia
  '49': 'DE',       // Alemania
  '51': 'PE',       // Perú
  '52': 'MX',       // México
  '53': 'CU',       // Cuba
  '54': 'AR',       // Argentina
  '55': 'BR',       // Brasil
  '56': 'CL',       // Chile
  '57': 'CO',       // Colombia
  '58': 'VE',       // Venezuela
  '60': 'MY',       // Malasia
  '61': 'AU',       // Australia
  '62': 'ID',       // Indonesia
  '63': 'PH',       // Filipinas
  '64': 'NZ',       // Nueva Zelanda
  '65': 'SG',       // Singapur
  '66': 'TH',       // Tailandia
  '81': 'JP',       // Japón
  '82': 'KR',       // Corea del Sur
  '84': 'VN',       // Vietnam
  '86': 'CN',       // China
  '90': 'TR',       // Turquía
  '91': 'IN',       // India
  '92': 'PK',       // Pakistán
  '93': 'AF',       // Afganistán
  '94': 'LK',       // Sri Lanka
  '95': 'MM',       // Myanmar
  '98': 'IR',       // Irán
  '212': 'MA',      // Marruecos
  '213': 'DZ',      // Argelia
  '216': 'TN',      // Túnez
  '218': 'LY',      // Libia
  '220': 'GM',      // Gambia
  '221': 'SN',      // Senegal
  '222': 'MR',      // Mauritania
  '223': 'ML',      // Mali
  '224': 'GN',      // Guinea
  '225': 'CI',      // Costa de Marfil
  '226': 'BF',      // Burkina Faso
  '227': 'NE',      // Níger
  '228': 'TG',      // Togo
  '229': 'BJ',      // Benín
  '230': 'MU',      // Mauricio
  '231': 'LR',      // Liberia
  '232': 'SL',      // Sierra Leona
  '233': 'GH',      // Ghana
  '234': 'NG',      // Nigeria
  '235': 'TD',      // Chad
  '236': 'CF',      // República Centroafricana
  '237': 'CM',      // Camerún
  '238': 'CV',      // Cabo Verde
  '239': 'ST',      // Santo Tomé y Príncipe
  '240': 'GQ',      // Guinea Ecuatorial
  '241': 'GA',      // Gabón
  '242': 'CG',      // República del Congo
  '243': 'CD',      // República Democrática del Congo
  '244': 'AO',      // Angola
  '245': 'GW',      // Guinea-Bissau
  '246': 'IO',      // Territorio Británico del Océano Índico
  '247': 'AC',      // Isla Ascensión
  '248': 'SC',      // Seychelles
  '249': 'SD',      // Sudán
  '250': 'RW',      // Ruanda
  '251': 'ET',      // Etiopía
  '252': 'SO',      // Somalia
  '253': 'DJ',      // Yibuti
  '254': 'KE',      // Kenia
  '255': 'TZ',      // Tanzania
  '256': 'UG',      // Uganda
  '257': 'BI',      // Burundi
  '258': 'MZ',      // Mozambique
  '260': 'ZM',      // Zambia
  '261': 'MG',      // Madagascar
  '262': 'RE',      // Reunión
  '263': 'ZW',      // Zimbabue
  '264': 'NA',      // Namibia
  '265': 'MW',      // Malaui
  '266': 'LS',      // Lesoto
  '267': 'BW',      // Botsuana
  '268': 'SZ',      // Esuatini
  '269': 'KM',      // Comoras
  '290': 'SH',      // Santa Elena
  '291': 'ER',      // Eritrea
  '297': 'AW',      // Aruba
  '298': 'FO',      // Islas Feroe
  '299': 'GL',      // Groenlandia
  '350': 'GI',      // Gibraltar
  '351': 'PT',      // Portugal
  '352': 'LU',      // Luxemburgo
  '353': 'IE',      // Irlanda
  '354': 'IS',      // Islandia
  '355': 'AL',      // Albania
  '356': 'MT',      // Malta
  '357': 'CY',      // Chipre
  '358': 'FI',      // Finlandia
  '359': 'BG',      // Bulgaria
  '370': 'LT',      // Lituania
  '371': 'LV',      // Letonia
  '372': 'EE',      // Estonia
  '373': 'MD',      // Moldavia
  '374': 'AM',      // Armenia
  '375': 'BY',      // Bielorrusia
  '376': 'AD',      // Andorra
  '377': 'MC',      // Mónaco
  '378': 'SM',      // San Marino
  '380': 'UA',      // Ucrania
  '381': 'RS',      // Serbia
  '382': 'ME',      // Montenegro
  '383': 'XK',      // Kosovo
  '385': 'HR',      // Croacia
  '386': 'SI',      // Eslovenia
  '387': 'BA',      // Bosnia y Herzegovina
  '389': 'MK',      // Macedonia del Norte
  '420': 'CZ',      // República Checa
  '421': 'SK',      // Eslovaquia
  '423': 'LI',      // Liechtenstein
  '500': 'FK',      // Islas Malvinas
  '501': 'BZ',      // Belice
  '502': 'GT',      // Guatemala
  '503': 'SV',      // El Salvador
  '504': 'HN',      // Honduras
  '505': 'NI',      // Nicaragua
  '506': 'CR',      // Costa Rica
  '507': 'PA',      // Panamá
  '508': 'PM',      // San Pedro y Miquelón
  '509': 'HT',      // Haití
  '590': 'GP',      // Guadalupe
  '591': 'BO',      // Bolivia
  '592': 'GY',      // Guyana
  '593': 'EC',      // Ecuador
  '594': 'GF',      // Guayana Francesa
  '595': 'PY',      // Paraguay
  '596': 'MQ',      // Martinica
  '597': 'SR',      // Surinam
  '598': 'UY',      // Uruguay
  '599': 'CW',      // Curazao
  '670': 'TL',      // Timor Oriental
  '672': 'NF',      // Isla Norfolk
  '673': 'BN',      // Brunéi
  '674': 'NR',      // Nauru
  '675': 'PG',      // Papúa Nueva Guinea
  '676': 'TO',      // Tonga
  '677': 'SB',      // Islas Salomón
  '678': 'VU',      // Vanuatu
  '679': 'FJ',      // Fiyi
  '680': 'PW',      // Palaos
  '681': 'WF',      // Wallis y Futuna
  '682': 'CK',      // Islas Cook
  '683': 'NU',      // Niue
  '684': 'AS',      // Samoa Americana
  '685': 'WS',      // Samoa
  '686': 'KI',      // Kiribati
  '687': 'NC',      // Nueva Caledonia
  '688': 'TV',      // Tuvalu
  '689': 'PF',      // Polinesia Francesa
  '690': 'TK',      // Tokelau
  '691': 'FM',      // Micronesia
  '692': 'MH',      // Islas Marshall
  '850': 'KP',      // Corea del Norte
  '852': 'HK',      // Hong Kong
  '853': 'MO',      // Macao
  '855': 'KH',      // Camboya
  '856': 'LA',      // Laos
  '880': 'BD',      // Bangladés
  '886': 'TW',      // Taiwán
  '960': 'MV',      // Maldivas
  '961': 'LB',      // Líbano
  '962': 'JO',      // Jordania
  '963': 'SY',      // Siria
  '964': 'IQ',      // Irak
  '965': 'KW',      // Kuwait
  '966': 'SA',      // Arabia Saudí
  '967': 'YE',      // Yemen
  '968': 'OM',      // Omán
  '970': 'PS',      // Palestina
  '971': 'AE',      // Emiratos Árabes Unidos
  '972': 'IL',      // Israel
  '973': 'BH',      // Baréin
  '974': 'QA',      // Catar
  '975': 'BT',      // Bután
  '976': 'MN',      // Mongolia
  '977': 'NP',      // Nepal
  '992': 'TJ',      // Tayikistán
  '993': 'TM',      // Turkmenistán
  '994': 'AZ',      // Azerbaiyán
  '995': 'GE',      // Georgia
  '996': 'KG',      // Kirguistán
  '998': 'UZ'       // Uzbekistán
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(__dirname);
const { say } = cfonts;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let isRunning = false;

const question = (texto) => new Promise((resolver) => rl.question(texto, resolver));

// Animación de inicio personalizada
say('Iniciando...', {
  font: 'simple',
  align: 'center',
  gradient: ['yellow', 'cyan'],
});

say('Luna-botv6', {
  font: 'block',
  align: 'center',
  gradient: ['blue', 'magenta'],
});

// Opcional: beep de sistema
process.stdout.write('\x07'); // sonido beep

console.log(chalk.cyanBright.bold('—◉ Bienvenido al sistema Luna-botv5'));
console.log(chalk.greenBright('—◉ Preparando entorno y verificaciones necesarias...'));

// Verificar y preparar carpeta ./src/tmp con permisos
const rutaTmp = join(__dirname, 'src/tmp');
if (!fs.existsSync(rutaTmp)) {
  fs.mkdirSync(rutaTmp, { recursive: true });
  console.log(chalk.greenBright('✔ Carpeta src/tmp creada.'));
}
try {
  fs.chmodSync(rutaTmp, 0o777);
  console.log(chalk.greenBright('✔ Permisos 777 aplicados a src/tmp.'));
} catch (err) {
  console.warn(chalk.yellowBright('⚠ No se pudieron aplicar permisos a src/tmp:'), err.message);
}

// Limpieza automática mejorada
function limpiarArchivosTMP() {
  console.log(chalk.cyan.bold('🧹 Iniciando limpieza en carpeta tmp/ y archivo core'));
  
  let totalEliminados = 0;
  let archivosTmp = 0;
  let archivoCore = false;

  // Limpiar carpeta tmp
  const tmpPath = join(__dirname, 'src/tmp');
  if (fs.existsSync(tmpPath)) {
    const archivos = fs.readdirSync(tmpPath);
    for (const archivo of archivos) {
      const rutaCompleta = join(tmpPath, archivo);
      try {
        fs.rmSync(rutaCompleta, { recursive: true, force: true });
        archivosTmp++;
        totalEliminados++;
      } catch (err) {
        console.error(chalk.red(`✖ Error eliminando ${archivo}:`), err.message);
      }
    }
  }

  // Limpiar archivo core de la raíz
  const coreFile = join(__dirname, 'core');
  if (fs.existsSync(coreFile)) {
    try {
      fs.rmSync(coreFile, { recursive: true, force: true });
      archivoCore = true;
      totalEliminados++;
    } catch (err) {
      console.error(chalk.red('✖ Error eliminando archivo core:'), err.message);
    }
  }

  // Mensaje de finalización después de 3 segundos
  setTimeout(() => {
    if (totalEliminados > 0) {
      let mensaje = chalk.cyan.bold('✨ Limpieza completada: ');
      if (archivosTmp > 0) {
        mensaje += chalk.red(`${archivosTmp} archivos tmp/`);
      }
      if (archivoCore) {
        mensaje += archivosTmp > 0 ? chalk.red(' + archivo core') : chalk.red('archivo core');
      }
      console.log(mensaje);
    } else {
      console.log(chalk.cyan.bold('✨ Limpieza completada: No había archivos para eliminar'));
    }
  }, 3000);
}

// Ejecutar limpieza cada 15 minutos
setInterval(limpiarArchivosTMP, 900000);

// Ejecutar una vez al inicio
limpiarArchivosTMP();

function verificarOCrearCarpetaAuth() {
  const authPath = join(__dirname, global.authFile);
  if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true });
  }
}

function verificarCredsJson() {
  const credsPath = join(__dirname, global.authFile, 'creds.json');
  return fs.existsSync(credsPath);
}

function formatearNumeroTelefono(numero) {
  let formattedNumber = numero.replace(/[^\d+]/g, '');
  if (formattedNumber.startsWith('+52') && !formattedNumber.startsWith('+521')) {
    formattedNumber = formattedNumber.replace('+52', '+521');
  } else if (formattedNumber.startsWith('52') && !formattedNumber.startsWith('521')) {
    formattedNumber = `+521${formattedNumber.slice(2)}`;
  } else if (formattedNumber.startsWith('52') && formattedNumber.length >= 12) {
    formattedNumber = `+${formattedNumber}`;
  } else if (!formattedNumber.startsWith('+')) {
    formattedNumber = `+${formattedNumber}`;
  }
  return formattedNumber;
}

function esNumeroValido(numeroTelefono) {
  const numeroSinSigno = numeroTelefono.replace('+', '');
  
  // Usar PHONENUMBER_MCC si está disponible, sino usar el fallback
  const codigosPais = Object.keys(PHONENUMBER_MCC).length > 0 ? PHONENUMBER_MCC : FALLBACK_COUNTRY_CODES;
  
  // Verificar si el número comienza con algún código de país válido
  const esValido = Object.keys(codigosPais).some(codigo => {
    return numeroSinSigno.startsWith(codigo);
  });
  
  // Validación adicional: el número debe tener al menos 7 dígitos después del código de país
  const tieneLogitudMinima = numeroSinSigno.length >= 7;
  
  // Validación específica para números comunes
  if (numeroSinSigno.startsWith('1') && numeroSinSigno.length >= 11) return true; // US/CA
  if (numeroSinSigno.startsWith('52') && numeroSinSigno.length >= 12) return true; // México
  if (numeroSinSigno.startsWith('54') && numeroSinSigno.length >= 11) return true; // Argentina
  if (numeroSinSigno.startsWith('55') && numeroSinSigno.length >= 13) return true; // Brasil
  if (numeroSinSigno.startsWith('34') && numeroSinSigno.length >= 11) return true; // España
  
  return esValido && tieneLogitudMinima;
}

async function start(file) {
  if (isRunning) return;
  isRunning = true;

  verificarOCrearCarpetaAuth();

  if (verificarCredsJson()) {
    const args = [join(__dirname, file), ...process.argv.slice(2)];
    setupMaster({ exec: args[0], args: args.slice(1) });
    const p = fork();
    return;
  }

  const opcion = await question(chalk.yellowBright.bold('—◉ㅤSeleccione una opción (solo el numero):\n') + chalk.white.bold('1. Con código QR\n2. Con código de texto de 8 dígitos\n—> '));

  let numeroTelefono = '';
  if (opcion === '2') {
    const phoneNumber = await question(chalk.yellowBright.bold('\n—◉ㅤEscriba su número de WhatsApp:\n') + chalk.white.bold('◉ㅤEjemplo: +5493483466763\n—> '));
    numeroTelefono = formatearNumeroTelefono(phoneNumber);
    if (!esNumeroValido(numeroTelefono)) {
      console.log(chalk.bgRed(chalk.white.bold('[ ERROR ] Número inválido. Asegúrese de haber escrito su numero en formato internacional y haber comenzado con el código de país.\n—◉ㅤEjemplo:\n◉ +5493483466763\n')));
      process.exit(0);
    }
    process.argv.push(numeroTelefono);
  }

  if (opcion === '1') {
    process.argv.push('qr');
  } else if (opcion === '2') {
    process.argv.push('code');
  }

  const args = [join(__dirname, file), ...process.argv.slice(2)];
  setupMaster({ exec: args[0], args: args.slice(1) });

  const p = fork();

  p.on('message', (data) => {
    console.log(chalk.green.bold('—◉ㅤRECIBIDO:'), data);
    switch (data) {
      case 'reset':
        p.process.kill();
        isRunning = false;
        start.apply(this, arguments);
        break;
      case 'uptime':
        p.send(process.uptime());
        break;
    }
  });

  p.on('exit', (_, code) => {
    isRunning = false;
    console.error(chalk.red.bold('[ ERROR ] Ocurrió un error inesperado:'), code);
    p.process.kill();
    isRunning = false;
    start.apply(this, arguments);
    if (process.env.pm_id) {
      process.exit(1);
    } else {
      process.exit();
    }
  });

  const opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
  if (!opts['test']) {
    if (!rl.listenerCount()) {
      rl.on('line', (line) => {
        p.emit('message', line.trim());
      });
    }
  }
}

start('main.js');