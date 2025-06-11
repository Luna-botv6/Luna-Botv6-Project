import chalk from 'chalk';
import { format } from 'util';

/**
 * Función personalizada para el manejo de errores
 * @param {Error} error - El error a loggear
 * @param {string} context - Contexto donde ocurrió el error (plugin, handler, etc.)
 */
export default function logError(error, context = 'unknown') {
  const timestamp = new Date().toISOString();
  const errorMessage = error?.message || error?.toString() || 'Error desconocido';
  const stack = error?.stack || 'Sin stack trace';
  
  console.error(chalk.red(`[ERROR ${timestamp}] Context: ${context}`));
  console.error(chalk.red(`Message: ${errorMessage}`));
  
  // Solo mostrar stack completo si es necesario para debugging
  if (process.env.DEBUG || global.debug) {
    console.error(chalk.gray(`Stack: ${stack}`));
  }
  
  // Opcional: guardar en archivo de log
  // fs.appendFileSync('./logs/errors.log', `${timestamp} - ${context}: ${errorMessage}\n${stack}\n\n`);
}