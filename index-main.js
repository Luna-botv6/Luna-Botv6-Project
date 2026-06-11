import { join, dirname } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { setupMaster, fork } from 'cluster';
import cfonts from 'cfonts';
import readline from 'readline';
import yargs from 'yargs';
import chalk from 'chalk';
import fs from 'fs/promises';
import fsSync from 'fs';
import v8 from 'v8';
import './config.js';

const PHONENUMBER_MCC = { '1': 'US/CA', '7': 'RU', '20': 'EG', '27': 'ZA', '30': 'GR', '31': 'NL', '32': 'BE', '33': 'FR', '34': 'ES', '36': 'HU', '39': 'IT', '40': 'RO', '41': 'CH', '43': 'AT', '44': 'GB', '45': 'DK', '46': 'SE', '47': 'NO', '48': 'PL', '49': 'DE', '51': 'PE', '52': 'MX', '521': 'MX', '53': 'CU', '54': 'AR', '55': 'BR', '56': 'CL', '57': 'CO', '58': 'VE', '60': 'MY', '61': 'AU', '62': 'ID', '63': 'PH', '64': 'NZ', '65': 'SG', '66': 'TH', '81': 'JP', '82': 'KR', '84': 'VN', '86': 'CN', '90': 'TR', '91': 'IN', '92': 'PK', '93': 'AF', '94': 'LK', '95': 'MM', '98': 'IR', '212': 'MA', '213': 'DZ', '216': 'TN', '218': 'LY', '220': 'GM', '221': 'SN', '222': 'MR', '223': 'ML', '224': 'GN', '225': 'CI', '226': 'BF', '227': 'NE', '228': 'TG', '229': 'BJ', '230': 'MU', '231': 'LR', '232': 'SL', '233': 'GH', '234': 'NG', '235': 'TD', '236': 'CF', '237': 'CM', '238': 'CV', '239': 'ST', '240': 'GQ', '241': 'GA', '242': 'CG', '243': 'CD', '244': 'AO', '245': 'GW', '246': 'IO', '247': 'AC', '248': 'SC', '249': 'SD', '250': 'RW', '251': 'ET', '252': 'SO', '253': 'DJ', '254': 'KE', '255': 'TZ', '256': 'UG', '257': 'BI', '258': 'MZ', '260': 'ZM', '261': 'MG', '262': 'RE', '263': 'ZW', '264': 'NA', '265': 'MW', '266': 'LS', '267': 'BW', '268': 'SZ', '269': 'KM', '290': 'SH', '291': 'ER', '297': 'AW', '298': 'FO', '299': 'GL', '350': 'GI', '351': 'PT', '352': 'LU', '353': 'IE', '354': 'IS', '355': 'AL', '356': 'MT', '357': 'CY', '358': 'FI', '359': 'BG', '370': 'LT', '371': 'LV', '372': 'EE', '373': 'MD', '374': 'AM', '375': 'BY', '376': 'AD', '377': 'MC', '378': 'SM', '380': 'UA', '381': 'RS', '382': 'ME', '385': 'HR', '386': 'SI', '387': 'BA', '389': 'MK', '420': 'CZ', '421': 'SK', '423': 'LI', '500': 'FK', '501': 'BZ', '502': 'GT', '503': 'SV', '504': 'HN', '505': 'NI', '506': 'CR', '507': 'PA', '508': 'PM', '509': 'HT', '590': 'GP', '591': 'BO', '592': 'GY', '593': 'EC', '594': 'GF', '595': 'PY', '596': 'MQ', '597': 'SR', '598': 'UY', '599': 'AN', '670': 'TL', '672': 'NF', '673': 'BN', '674': 'NR', '675': 'PG', '676': 'TO', '677': 'SB', '678': 'VU', '679': 'FJ', '680': 'PW', '681': 'WF', '682': 'CK', '683': 'NU', '685': 'WS', '686': 'KI', '687': 'NC', '688': 'TV', '689': 'PF', '690': 'TK', '691': 'FM', '692': 'MH', '850': 'KP', '852': 'HK', '853': 'MO', '855': 'KH', '856': 'LA', '880': 'BD', '886': 'TW', '960': 'MV', '961': 'LB', '962': 'JO', '963': 'SY', '964': 'IQ', '965': 'KW', '966': 'SA', '967': 'YE', '968': 'OM', '970': 'PS', '971': 'AE', '972': 'IL', '973': 'BH', '974': 'QA', '975': 'BT', '976': 'MN', '977': 'NP', '992': 'TJ', '993': 'TM', '994': 'AZ', '995': 'GE', '996': 'KG', '998': 'UZ' };

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(__dirname);
const { say } = cfonts;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let isRunning = false;

const question = (texto) => new Promise((resolver) => rl.question(texto, resolver));

function showMemoryInfo() {
  const heapStats = v8.getHeapStatistics();
  const totalMemMB = parseInt(process.env.TOTAL_MEMORY_MB || '0');
  const heapLimitMB = Math.floor(heapStats.heap_size_limit / (1024 * 1024));
  const heapUsedMB = Math.floor(heapStats.used_heap_size / (1024 * 1024));
  const heapPercent = ((heapStats.used_heap_size / heapStats.heap_size_limit) * 100).toFixed(1);

  console.log(chalk.cyan(`📊 RAM Servidor: ${(totalMemMB / 1024).toFixed(2)}GB (${totalMemMB}MB)`));
  console.log(chalk.cyan(`🧠 Heap Node: ${heapUsedMB}MB / ${heapLimitMB}MB (${heapPercent}%)`));
}

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

process.stdout.write('\x07');

showMemoryInfo();

console.log(chalk.hex('#00FFFF').bold('\n─◉ Bienvenido al sistema Luna-botv6'));
console.log(chalk.hex('#FF00FF')('─◉ Preparando entorno y verificaciones necesarias...'));

const rutaTmp = join(__dirname, 'src/tmp');
try {
  await fs.mkdir(rutaTmp, { recursive: true });
  await fs.chmod(rutaTmp, 0o777);
  console.log(chalk.hex('#39FF14')('✓ Carpeta src/tmp configurada correctamente.'));
} catch (err) {
  console.warn(chalk.hex('#FFA500')('⚠ Error configurando src/tmp:'), err.message);
}

async function limpiarArchivosTMP() {
  const tmpPath = join(__dirname, 'src/tmp');
  const coreFile = join(__dirname, 'core');
  const MAX_AGE = 300000;
  const stats = { tmp: 0, core: false, total: 0 };

  try {
    const [tmpFiles, coreExists] = await Promise.allSettled([
      fs.readdir(tmpPath),
      fs.access(coreFile).then(() => true).catch(() => false)
    ]);

    if (tmpFiles.status === 'fulfilled' && tmpFiles.value.length > 0) {
      const now = Date.now();
      const deletePromises = tmpFiles.value.map(async (file) => {
        try {
          const fullPath = join(tmpPath, file);
          const fileStat = await fs.stat(fullPath);
          
          if (now - fileStat.mtimeMs > MAX_AGE) {
            await fs.rm(fullPath, { recursive: true, force: true });
            stats.tmp++;
            return true;
          }
        } catch (err) {
          return false;
        }
        return false;
      });

      await Promise.allSettled(deletePromises);
    }

    if (coreExists.status === 'fulfilled' && coreExists.value) {
      try {
        await fs.rm(coreFile, { force: true });
        stats.core = true;
      } catch {}
    }

    stats.total = stats.tmp + (stats.core ? 1 : 0);

    if (stats.total > 0) {
      const parts = [];
      if (stats.tmp > 0) parts.push(`${stats.tmp} tmp/`);
      if (stats.core) parts.push('core');
      console.log(chalk.hex('#00CED1')(`✨ Limpieza: ${parts.join(', ')}`));
    }
  } catch (err) {}
}

function forceGC() {
  if (global.gc) {
    try {
      const heapBefore = v8.getHeapStatistics().used_heap_size;
      global.gc();
      const heapAfter = v8.getHeapStatistics().used_heap_size;
      const freedMB = ((heapBefore - heapAfter) / (1024 * 1024)).toFixed(2);
      if (freedMB > 1) {
        console.log(chalk.hex('#39FF14')(`🧹 GC: liberó ${freedMB}MB`));
      }
      return true;
    } catch (err) {}
  }
  return false;
}

function checkMemoryAndClean() {
  try {
    const heapStats = v8.getHeapStatistics();
    const heapPercent = (heapStats.used_heap_size / heapStats.heap_size_limit) * 100;
    const heapUsedMB = Math.floor(heapStats.used_heap_size / (1024 * 1024));
    const heapLimitMB = Math.floor(heapStats.heap_size_limit / (1024 * 1024));

    if (heapPercent > 85) {
      console.log(chalk.hex('#FFA500')(`⚠️  Heap: ${heapPercent.toFixed(1)}% (${heapUsedMB}/${heapLimitMB}MB)`));
      forceGC();
    } else if (heapPercent > 75) {
      forceGC();
    }
  } catch (err) {}
}

let limpiezaActiva = false;

async function ejecutarLimpieza() {
  if (limpiezaActiva) return;
  limpiezaActiva = true;
  try {
    await limpiarArchivosTMP();
    checkMemoryAndClean();
  } catch (err) {
  } finally {
    setTimeout(() => { limpiezaActiva = false; }, 5000);
  }
}

setInterval(ejecutarLimpieza, 900000);
setTimeout(ejecutarLimpieza, 3000);

setInterval(() => {
  checkMemoryAndClean();
}, 120000);

setInterval(() => {
  try {
    const heapStats = v8.getHeapStatistics();
    const heapPercent = (heapStats.used_heap_size / heapStats.heap_size_limit) * 100;
    const heapUsedMB = Math.floor(heapStats.used_heap_size / (1024 * 1024));
    const heapLimitMB = Math.floor(heapStats.heap_size_limit / (1024 * 1024));
    
    if (heapPercent > 90) {
      console.log(chalk.red.bold(`🚨 CRÍTICO: Heap ${heapPercent.toFixed(1)}% (${heapUsedMB}/${heapLimitMB}MB)`));
      console.log(chalk.yellow('💡 Considera reiniciar si persiste'));
      forceGC();
    } else if (heapPercent > 80) {
      console.log(chalk.yellow(`⚠️  Heap alto: ${heapPercent.toFixed(1)}% (${heapUsedMB}/${heapLimitMB}MB)`));
    }
  } catch (err) {}
}, 60000);

process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Error no capturado:'), error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('❌ Promise rechazada:'), reason);
});

async function verificarOCrearCarpetaAuth() {
  const authPath = join(__dirname, global.authFile);
  try {
    await fs.mkdir(authPath, { recursive: true });
  } catch {}
}

function verificarCredsJson() {
  const credsPath = join(__dirname, global.authFile, 'creds.json');
  return fsSync.existsSync(credsPath);
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
  return Object.keys(PHONENUMBER_MCC).some(codigo => numeroSinSigno.startsWith(codigo));
}

async function start(file) {
  if (isRunning) return;
  isRunning = true;

  await verificarOCrearCarpetaAuth();

  if (verificarCredsJson()) {
    const args = [join(__dirname, file), ...process.argv.slice(2)];
    setupMaster({ exec: args[0], args: args.slice(1) });
    const p = fork();
    p.on('exit', (_, code) => {
      isRunning = false;
      if (process.env.pm_id) {
        process.exit(1);
      } else {
        process.exit();
      }
    });
    return;
  }

  const opcion = await question(chalk.hex('#FFD700').bold('─◉　Seleccione una opción (solo el numero):\n') + chalk.hex('#E0E0E0').bold('1. Con código QR\n2. Con código de texto de 8 dígitos\n─> '));

  let numeroTelefono = '';
  if (opcion === '2') {
    const phoneNumber = await question(chalk.hex('#FFD700').bold('\n─◉　Escriba su número de WhatsApp:\n') + chalk.hex('#E0E0E0').bold('◉　Ejemplo: +5493483466763\n─> '));
    numeroTelefono = formatearNumeroTelefono(phoneNumber);
    if (!esNumeroValido(numeroTelefono)) {
      console.log(chalk.bgHex('#FF1493')(chalk.white.bold('[ ERROR ] Número inválido. Asegúrese de haber escrito su numero en formato internacional y haber comenzado con el código de país.\n─◉　Ejemplo:\n◉ +5493483466763\n')));
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
    console.log(chalk.hex('#39FF14').bold('─◉　RECIBIDO:'), data);
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
    console.error(chalk.hex('#FF1493').bold('[ ERROR ] Ocurrió un error inesperado:'), code);
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