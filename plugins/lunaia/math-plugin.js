import { create, all } from 'mathjs';

const math = create(all);
const BOT = () => global.BotName || 'Luna';

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿¡?!]/g, '')
    .trim();
}

const TOKEN_MAP = {
  cero: '0', uno: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9',
  diez: '10', once: '11', doce: '12', trece: '13', catorce: '14', quince: '15', dieciseis: '16', diecisiete: '17',
  dieciocho: '18', diecinueve: '19', veinte: '20', veintiuno: '21', veintidos: '22', veintitres: '23', veinticuatro: '24',
  veinticinco: '25', veintiseis: '26', veintisiete: '27', veintiocho: '28', veintinueve: '29', treinta: '30',
  cuarenta: '40', cincuenta: '50', sesenta: '60', setenta: '70', ochenta: '80', noventa: '90',
  cien: '100', ciento: '100', doscientos: '200', trescientos: '300', cuatrocientos: '400', quinientos: '500', mil: '1000',
  mas: '+', menos: '-', por: '*', veces: '*', dividido: '/', entre: '/',
  cuanto: '', cuantos: '', cuantas: '', cuento: '', como: '', es: '', son: '', da: '', vale: '', queda: '',
  el: '', la: '', los: '', las: '', del: '', al: '', de: '', un: '', una: '', en: '',
  calcula: '', calculame: '', resolveme: '', resultado: '', cual: '', que: '', porfa: '', porfavor: '', pls: '', luna: '', oye: ''
};

const SPECIAL_WORDS = {
  'al cuadrado': '^2',
  'al cubo': '^3',
  'raiz de': 'sqrt',
  'mitad de': '/2_MITAD',
  'doble de': '*2_DOBLE'
};

// Las frases de matemática "en lenguaje natural" (sin números/operadores
// explícitos) se superponen bastante con el español cotidiano: "resultado
// de" (resultado de las elecciones), "mitad de" (la mitad de la pizza),
// "doble de" (el doble de caro), "porcentaje" (el porcentaje de aprobados),
// "raiz de" (la raíz del problema), etc. Esas van a nivel "weak" (solo si
// el mensaje es corto). Las que ya son inequívocamente matemáticas
// ("derivada de", "factorial de", "ecuacion", "despeja", "calcula") quedan
// libres. Los MATH_PATTERNS (números con operadores explícitos, tipo
// "2+2" o "50%") tampoco tienen restricción: ahí no hay ambigüedad posible.
const STRONG_TRIGGER_PHRASES = ['derivada de', 'factorial de', 'ecuacion', 'despeja', 'calcula', 'calculame', 'resolveme'];
const WEAK_TRIGGER_PHRASES = [
  'cuanto es', 'cuanto son', 'cuanto da', 'cuanto vale', 'cuanto queda', 'cuento es',
  'cuantos son', 'cuantas son', 'resultado de', 'raiz de', 'promedio de', 'media de',
  'porcentaje', 'mitad de', 'doble de', 'triple de'
];
const MAX_WORDS_FOR_WEAK_MATCH = 6;

const MATH_PATTERNS = [/\d[+\-*/^×÷]\d/, /\d+\s*%/, /\bx\s*[+\-*/^=]/i, /[+\-*/^=]\s*x\b/i];

function canHandle(text) {
  const normalized = normalize(text);
  if (MATH_PATTERNS.some(p => p.test(normalized))) return true;
  if (STRONG_TRIGGER_PHRASES.some(k => normalized.includes(k))) return true;

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  if (wordCount > MAX_WORDS_FOR_WEAK_MATCH) return false;

  return WEAK_TRIGGER_PHRASES.some(k => normalized.includes(k));
}

function buildExpr(text) {
  let expr = normalize(text);
  expr = expr.replace(/@\d+/g, '').trim();
  expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/°/g, ' deg');

  for (const [phrase, replacement] of Object.entries(SPECIAL_WORDS)) {
    expr = expr.replace(new RegExp(phrase, 'g'), replacement);
  }

  expr = expr.replace(/(\d+)\s*\/2_MITAD/g, '$1/2');
  expr = expr.replace(/(\d+)\s*\*2_DOBLE/g, '$1*2');
  expr = expr.replace(/sqrt\s+(\d+)/g, 'sqrt($1)');
  expr = expr.replace(/seno?\b/g, 'sin').replace(/coseno?\b/g, 'cos').replace(/tangente?\b/g, 'tan');

  const tokens = expr.split(/\s+/).map(t => TOKEN_MAP.hasOwnProperty(t) ? TOKEN_MAP[t] : t);
  let result = tokens.join(' ');
  result = result.replace(/(\d)\s+x\s+(\d)/g, '$1*$2');
  result = result.replace(/(\d)([a-wyzA-WYZ])/g, '$1*$2');
  return result.replace(/\s+/g, ' ').trim();
}

function detectType(normalized) {
  if (/derivada|derivative/.test(normalized)) return 'derivative';
  if (/\d+\s*%|porcentaje/.test(normalized)) return 'percentage';
  if (/promedio|media de/.test(normalized)) return 'stats';
  if (/=/.test(normalized) && /x/.test(normalized)) return 'equation';
  return 'evaluate';
}

function handlePercentage(text) {
  const normalized = normalize(text);
  const match = normalized.match(/(\d+[.,]?\d*)\s*%\s*(?:de\s+)?(\d+[.,]?\d*)/);
  if (!match) return null;

  const percent = parseFloat(match[1]);
  const base = parseFloat(match[2].replace(',', '.'));
  const result = (percent / 100) * base;

  return {
    expr: `${percent}% de ${base}`,
    result: String(result),
    steps: [`${percent} ÷ 100 × ${base} = ${result}`]
  };
}

function handleEquation(text) {
  try {
    const expr = buildExpr(text);
    if (!expr.includes('=')) return null;

    const sides = expr.replace(/\s/g, '').split('=');
    const diffExpr = `(${sides[0]})-(${sides[1]})`;
    const slope = math.evaluate(diffExpr.replace(/x/g, '(1)')) - math.evaluate(diffExpr.replace(/x/g, '(0)'));
    const constant = math.evaluate(diffExpr.replace(/x/g, '(0)'));

    if (Math.abs(slope) < 1e-10) return null;

    const solution = math.format(-constant / slope, { precision: 6 });
    return { expr, result: `x = ${solution}`, steps: [`Ecuación: ${expr}`, `x = ${solution}`] };
  } catch {
    return null;
  }
}

function handleDerivative(text) {
  try {
    const match = normalize(text).match(/derivada\s+de\s+(.+)/);
    if (!match) return null;

    let expr = match[1].replace(/×/g, '*').replace(/(\d)([a-wyzA-WYZ])/g, '$1*$2');
    const derivative = math.simplify(math.derivative(expr, 'x')).toString();

    return { expr, result: derivative, steps: [`d/dx (${expr}) = ${derivative}`] };
  } catch {
    return null;
  }
}

function handleStats(text) {
  try {
    const numbers = normalize(text).match(/\d+[.,]?\d*/g);
    if (!numbers || numbers.length < 2) return null;

    const values = numbers.map(n => parseFloat(n.replace(',', '.')));
    const mean = math.format(math.mean(values), { precision: 4 });
    const median = math.format(math.median(values), { precision: 4 });

    return {
      expr: `[${values.join(', ')}]`,
      result: `Promedio: ${mean}`,
      steps: [`Promedio: ${mean}`, `Mediana: ${median}`]
    };
  } catch {
    return null;
  }
}

function handleEvaluate(text) {
  try {
    const expr = buildExpr(text);
    if (!expr || expr.length < 1) return null;

    const result = math.evaluate(expr);
    if (result === undefined || result === null) return null;

    return { expr, result: math.format(result, { precision: 8 }), steps: [] };
  } catch {
    return null;
  }
}

const TYPE_LABELS = {
  derivative: '📐 *Derivada*',
  percentage: '💯 *Porcentaje*',
  equation: '🔢 *Ecuación*',
  stats: '📊 *Estadística*',
  evaluate: '🧮 *Resultado*'
};

function buildResponse(senderTag, senderId, type, data) {
  if (!data) {
    return {
      text: `🌙 *${BOT()}*\n\n${senderTag} no entendí esa operación 😅\n\n` +
        `Probá con algo como:\n• _cuánto es 2+2_\n• _la mitad de 5000_\n` +
        `• _derivada de x^3_\n• _2x+7=11_ 💜`,
      mentions: [senderId]
    };
  }

  let body = `🌙 *${BOT()}*\n\n${senderTag} acá va 😊\n\n`;
  body += `${TYPE_LABELS[type] || '🧮 *Resultado*'}\n`;
  body += `📝 *Expresión:* \`${data.expr}\`\n`;
  body += `✅ *Resultado:* \`${data.result}\`\n`;
  if (data.steps?.length) {
    body += '\n📋 *Pasos:*\n';
    data.steps.forEach(step => { body += `   • ${step}\n`; });
  }
  body += '\n💜';

  return { text: body, mentions: [senderId] };
}

async function handle(text, { conn, msg, jid }) {
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderTag = '@' + senderId.split('@')[0];

  try {
    const normalized = normalize(text);
    const type = detectType(normalized);

    let result = null;
    if (type === 'percentage') result = handlePercentage(text);
    else if (type === 'derivative') result = handleDerivative(text);
    else if (type === 'equation') result = handleEquation(text);
    else if (type === 'stats') result = handleStats(text);
    else result = handleEvaluate(text);

    if (!result) result = handleEvaluate(text);

    await conn.sendMessage(jid, buildResponse(senderTag, senderId, type, result), { quoted: msg });
  } catch {
    await conn.sendMessage(jid, {
      text: `🌙 *${BOT()}*\n\n${senderTag} algo salió mal 😅 Probá con la expresión más clara 💜`,
      mentions: [senderId]
    }, { quoted: msg });
  }
}

export default {
  canHandle,
  handle,
  name: 'math',
  description: 'Resuelve operaciones matemáticas 🧮'
};
