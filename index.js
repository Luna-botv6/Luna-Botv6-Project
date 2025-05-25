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

const { PHONENUMBER_MCC } = await import('@whiskeysockets/baileys');
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

say('Luna-botv5', {
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

// Limpieza automática de archivos temporales cada minuto
function limpiarArchivosTMP() {
  const tmpPath = join(__dirname, 'src/tmp');
  if (fs.existsSync(tmpPath)) {
    const archivos = fs.readdirSync(tmpPath);
    let eliminados = 0;

    for (const archivo of archivos) {
      const rutaCompleta = join(tmpPath, archivo);
      try {
        fs.rmSync(rutaCompleta, { recursive: true, force: true });
        eliminados++;
      } catch (err) {
        console.error(chalk.red(`✖ Error eliminando ${archivo}:`), err.message);
      }
    }

    const fechaHora = new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      hour12: false,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    console.log(chalk.cyanBright('\n╭────────────── INFO ──────────────╮'));
    console.log(chalk.greenBright(`│ ✅ Eliminados ${eliminados.toString().padStart(2, '0')} archivo(s) temporales          │`));
    console.log(chalk.greenBright(`│ 🕒 Hora: ${fechaHora.padEnd(30)}│`));
    console.log(chalk.cyanBright('╰──────────────────────────────────╯'));

    say('LIMPIEZA', {
      font: 'chrome',
      align: 'center',
      colors: ['cyan', 'magenta'],
    });

    say('COMPLETA', {
      font: 'chrome',
      align: 'center',
      colors: ['yellow', 'green'],
    });

    process.stdout.write('\x07'); // beep al terminar limpieza
  }
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
  return Object.keys(PHONENUMBER_MCC).some(codigo => numeroSinSigno.startsWith(codigo));
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


