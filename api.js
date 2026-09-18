import {watchFile, unwatchFile} from 'fs';
import chalk from 'chalk';
import {fileURLToPath} from 'url';

global.APIs = {};
global.APIKeys = {};

const file = fileURLToPath(import.meta.url);
watchFile(file, () => {
  unwatchFile(file);
  console.log(chalk.redBright('Update \'api.js\''));
  import(`${file}?update=${Date.now()}`);
});