import path from 'path';
import chalk from 'chalk';
import fetch from 'node-fetch';
import fs from 'fs';
import {fileTypeFromBuffer} from 'file-type';
import {format} from 'util';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const coreUtils = {
  decodeJid(jid) {
    if (!jid || typeof jid !== 'string') return (!nullish(jid) && jid) || null;
    return jid.decodeJid();
  },

  logger: {
    info(...args) {
      console.log(
        chalk.bold.bgRgb(51, 204, 51)('INFO '),
        `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
        chalk.cyan(format(...args)),
      );
    },
    error(...args) {
      console.log(
        chalk.bold.bgRgb(247, 38, 33)('ERROR '),
        `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
        chalk.rgb(255, 38, 0)(format(...args)),
      );
    },
    warn(...args) {
      console.log(
        chalk.bold.bgRgb(255, 153, 0)('WARNING '),
        `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
        chalk.redBright(format(...args)),
      );
    },
    trace(...args) {
      console.log(
        chalk.grey('TRACE '),
        `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
        chalk.white(format(...args)),
      );
    },
    debug(...args) {
      console.log(
        chalk.bold.bgRgb(66, 167, 245)('DEBUG '),
        `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
        chalk.white(format(...args)),
      );
    },
  },

  async getFile(PATH, saveToFile = false) {
    let res; let filename;
    const data = Buffer.isBuffer(PATH) ? PATH : PATH instanceof ArrayBuffer ? PATH.toBuffer() : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer() : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0);
    if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer');
    const type = await fileTypeFromBuffer(data) || {
      mime: 'application/octet-stream',
      ext: '.bin',
    };
    if (data && saveToFile && !filename) (filename = path.join(__dirname, '../tmp/' + new Date * 1 + '.' + type.ext), await fs.promises.writeFile(filename, data));
    return {
      res,
      filename,
      ...type,
      data,
      deleteFile() {
        return filename && fs.promises.unlink(filename);
      },
    };
  },

  waitEvent(conn, eventName, is = () => true, maxTries = 25) {
    return new Promise((resolve, reject) => {
      let tries = 0;
      const on = (...args) => {
        if (++tries > maxTries) reject('Max tries reached');
        else if (is()) {
          conn.ev.off(eventName, on);
          resolve(...args);
        }
      };
      conn.ev.on(eventName, on);
    });
  }
};

export function nullish(args) {
  return !(args !== null && args !== undefined);
}
