import moment from 'moment-timezone';

const handler = async (m, {conn}) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.herramientas_tz || {};
  const tzPE = moment().tz('America/Lima').format('DD/MM HH:mm');
  const tzMX = moment().tz('America/Mexico_City').format('DD/MM HH:mm');
  const tzBO = moment().tz('America/La_Paz').format('DD/MM HH:mm');
  const tzCL = moment().tz('America/Santiago').format('DD/MM HH:mm');
  const tzAR = moment().tz('America/Argentina/Buenos_Aires').format('DD/MM HH:mm');
  const tzCO = moment().tz('America/Bogota').format('DD/MM HH:mm');
  const tzEC = moment().tz('America/Guayaquil').format('DD/MM HH:mm');
  const tzCR = moment().tz('America/Costa_Rica').format('DD/MM HH:mm');
  const tzCU = moment().tz('America/Havana').format('DD/MM HH:mm');
  const tzGT = moment().tz('America/Guatemala').format('DD/MM HH:mm');
  const tzHN = moment().tz('America/Tegucigalpa').format('DD/MM HH:mm');
  const tzNI = moment().tz('America/Managua').format('DD/MM HH:mm');
  const tzPA = moment().tz('America/Panama').format('DD/MM HH:mm');
  const tzUY = moment().tz('America/Montevideo').format('DD/MM HH:mm');
  const tzVE = moment().tz('America/Caracas').format('DD/MM HH:mm');
  const tzPY = moment().tz('America/Asuncion').format('DD/MM HH:mm');
  const tzNY = moment().tz('America/New_York').format('DD/MM HH:mm');
  const tzBR = moment().tz('America/Sao_Paulo').format('DD/MM HH:mm');
  const tzAS = moment().tz('Asia/Jakarta').format('DD/MM HH:mm');
  const tzAF = moment().tz('Africa/Malabo').format('DD/MM HH:mm');
  const tzServer = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzServerTime = moment().tz(tzServer).format('DD/MM HH:mm');
  const ltr = String.fromCharCode(8206).repeat(850);
  const texto = t.texto?.replace('{peru}', tzPE).replace('{mexico}', tzMX).replace('{bolivia}', tzBO).replace('{chile}', tzCL).replace('{argentina}', tzAR).replace('{colombia}', tzCO).replace('{ecuador}', tzEC).replace('{costa_rica}', tzCR).replace('{cuba}', tzCU).replace('{guatemala}', tzGT).replace('{honduras}', tzHN).replace('{nicaragua}', tzNI).replace('{panama}', tzPA).replace('{uruguay}', tzUY).replace('{venezuela}', tzVE).replace('{paraguay}', tzPY).replace('{new_york}', tzNY).replace('{brasil}', tzBR).replace('{asia}', tzAS).replace('{africa}', tzAF).replace('{invisible}', ltr).replace('{stz}', tzServer).replace('{sh}', tzServerTime) || `\`\`\`
< 𝙃𝙀𝙍𝙍𝘼𝙈𝙄𝙀𝙉𝙏𝘼𝙎 -𝙏𝙕 />

▢ Perú       : ${tzPE}
▢ México     : ${tzMX}
▢ Bolivia    : ${tzBO}
▢ Chile      : ${tzCL}
▢ Argentina  : ${tzAR}
▢ Colombia   : ${tzCO}
▢ Ecuador    : ${tzEC}
▢ Costa Rica : ${tzCR}
▢ Cuba       : ${tzCU}
▢ Guatemala  : ${tzGT}
▢ Honduras   : ${tzHN}
▢ Nicaragua  : ${tzNI}
▢ Panamá     : ${tzPA}
▢ Uruguay    : ${tzUY}
▢ Venezuela  : ${tzVE}
▢ Paraguay   : ${tzPY}
▢ New York   : ${tzNY}
▢ Brasil     : ${tzBR}
▢ Asia       : ${tzAS}
▢ África     : ${tzAF}
\`\`\`
${String.fromCharCode(8206).repeat(850)}
▢ TZ del servidor:\n • ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n • ${moment().tz(Intl.DateTimeFormat().resolvedOptions().timeZone).format('DD/MM HH:mm')}`;
  await conn.sendMessage(m.chat, {text: texto}, {quoted: m});
};

handler.command = /^(tz|hora|fecha|horario)$/i;
export default handler;
