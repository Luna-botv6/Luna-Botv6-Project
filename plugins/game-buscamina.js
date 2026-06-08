import { addExp, addMoney } from '../lib/stats.js';

// Función para inicializar el juego
function initGame(size = 5, mines = 5) {
  const board = Array(size).fill().map(() => Array(size).fill(0));
  const revealed = Array(size).fill().map(() => Array(size).fill(false));
  const flagged = Array(size).fill().map(() => Array(size).fill(false));
  
  // Colocar minas aleatoriamente
  let minesPlaced = 0;
  while (minesPlaced < mines) {
    const row = Math.floor(Math.random() * size);
    const col = Math.floor(Math.random() * size);
    
    if (board[row][col] !== -1) {
      board[row][col] = -1; // -1 representa mina
      minesPlaced++;
    }
  }
  
  // Calcular números alrededor de las minas
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (board[i][j] !== -1) {
        let count = 0;
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const ni = i + di;
            const nj = j + dj;
            if (ni >= 0 && ni < size && nj >= 0 && nj < size && board[ni][nj] === -1) {
              count++;
            }
          }
        }
        board[i][j] = count;
      }
    }
  }
  
  return { board, revealed, flagged, size, mines, gameOver: false, won: false };
}

// Función para mostrar el tablero
function displayBoard(gameData) {
  const { board, revealed, flagged, size } = gameData;
  let display = '```\n   ';
  
  // Números de columna
  for (let j = 0; j < size; j++) {
    display += ` ${j + 1} `;
  }
  display += '\n';
  
  // Filas del tablero
  for (let i = 0; i < size; i++) {
    display += `${String.fromCharCode(65 + i)}  `; // A, B, C, etc.
    
    for (let j = 0; j < size; j++) {
      if (flagged[i][j]) {
        display += '🚩 ';
      } else if (!revealed[i][j]) {
        display += '🟦 ';
      } else if (board[i][j] === -1) {
        display += '💣 ';
      } else if (board[i][j] === 0) {
        display += '⬜ ';
      } else {
        // Mostrar números del 1-8
        const numbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
        display += `${numbers[board[i][j]]} `;
      }
    }
    display += '\n';
  }
  display += '```';
  return display;
}

// Función para revelar celdas (incluye flood fill para celdas vacías)
function revealCell(gameData, row, col) {
  const { board, revealed, flagged, size } = gameData;
  
  if (row < 0 || row >= size || col < 0 || col >= size || revealed[row][col] || flagged[row][col]) {
    return;
  }
  
  revealed[row][col] = true;
  
  // Si es una mina, game over
  if (board[row][col] === -1) {
    gameData.gameOver = true;
    return;
  }
  
  // Si es una celda vacía, revelar celdas adyacentes
  if (board[row][col] === 0) {
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        revealCell(gameData, row + di, col + dj);
      }
    }
  }
}

// Función para verificar victoria
function checkWin(gameData) {
  const { board, revealed, size, mines } = gameData;
  let revealedCount = 0;
  
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (revealed[i][j]) revealedCount++;
    }
  }
  
  return revealedCount === (size * size - mines);
}

const handler = async (m, { conn, args }) => {
  const userId = m.sender;
  
  // Inicializar datos del usuario si no existen
  if (!global.db.data.users[userId]) {
    global.db.data.users[userId] = {};
  }
  
  if (!global.db.data.users[userId].buscaminas) {
    global.db.data.users[userId].buscaminas = null;
  }
  
  const command = args[0]?.toLowerCase();
  const coordinate = args[1]?.toUpperCase();
  
  // Nuevo juego
  if (!command || command === 'nuevo') {
    const gameData = initGame(5, 5); // Tablero 5x5 con 5 minas
    global.db.data.users[userId].buscaminas = gameData;
    
    let message = '╭━〔 🎮 *BUSCAMINAS* 🎮 〕━⬣\n';
    message += '┃ ¡Nuevo juego iniciado!\n';
    message += '┃ Para jugar usa:\n';
    message += '┃ • `buscaminas revelar A1` - Revelar celda\n';
    message += '┃ • `buscaminas bandera A1` - Colocar/quitar bandera\n';
    message += '┃ • `buscaminas tablero` - Ver tablero actual\n';
    message += '┃ 🎁 Premio: 10,000 XP + 6,000 💎\n';
    message += '╰━━━━━━━━━━━━━━━━━━⬣\n\n';
    message += displayBoard(gameData);
    
    return m.reply(message);
  }
  
  const gameData = global.db.data.users[userId].buscaminas;
  
  if (!gameData) {
    return m.reply('❌ No tienes un juego activo. Usa `buscaminas` para empezar');
  }
  
  if (gameData.gameOver || gameData.won) {
    return m.reply('❌ El juego ha terminado. Usa `buscaminas` para nuevo juego');
  }
  
  // Mostrar tablero
  if (command === 'tablero') {
    return m.reply(displayBoard(gameData));
  }
  
  // Procesar coordenadas
  if (!coordinate || coordinate.length < 2) {
    return m.reply('❌ Coordenada inválida. Usa formato: A1, B2, etc.');
  }
  
  const row = coordinate.charCodeAt(0) - 65; // A=0, B=1, etc.
  const col = parseInt(coordinate.slice(1)) - 1; // 1=0, 2=1, etc.
  
  if (row < 0 || row >= gameData.size || col < 0 || col >= gameData.size) {
    return m.reply('❌ Coordenada inválida. Usa formato: A1, B2, etc.');
  }
  
  // Revelar celda
  if (command === 'revelar') {
    // Si la celda ya está revelada, hacer despeje inteligente
    if (gameData.revealed[row][col] && gameData.board[row][col] > 0) {
      // Contar banderas alrededor
      let flagCount = 0;
      const adjacentCells = [];
      
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const ni = row + di;
          const nj = col + dj;
          if (ni >= 0 && ni < gameData.size && nj >= 0 && nj < gameData.size && !(di === 0 && dj === 0)) {
            if (gameData.flagged[ni][nj]) flagCount++;
            if (!gameData.revealed[ni][nj] && !gameData.flagged[ni][nj]) {
              adjacentCells.push([ni, nj]);
            }
          }
        }
      }
      
      // Si hay el número correcto de banderas, revelar celdas restantes
      if (flagCount === gameData.board[row][col]) {
        adjacentCells.forEach(([ni, nj]) => {
          revealCell(gameData, ni, nj);
        });
      }
    } else {
      revealCell(gameData, row, col);
    }
    
    // Verificar si perdió
    if (gameData.gameOver) {
      // Revelar todas las minas
      for (let i = 0; i < gameData.size; i++) {
        for (let j = 0; j < gameData.size; j++) {
          if (gameData.board[i][j] === -1) {
            gameData.revealed[i][j] = true;
          }
        }
      }
      
      let message = '💣 ¡BOOM! Has perdido\n\n';
      message += displayBoard(gameData);
      return m.reply(message);
    }
    
    // Verificar si ganó
    if (checkWin(gameData)) {
      gameData.won = true;
      const expGained = 10000; // 10,000 XP fijos
      const diamondsGained = 6000; // 6,000 diamantes fijos
      
      // Agregar recompensas
      addExp(userId, expGained);
      addMoney(userId, diamondsGained);
      
      let message = '🎉 ¡Felicidades! Has ganado el Buscaminas\n';
      message += `✨ Experiencia ganada: *${expGained.toLocaleString()}*\n`;
      message += `💎 Diamantes ganados: *${diamondsGained.toLocaleString()}*\n\n`;
      message += displayBoard(gameData);
      return m.reply(message);
    }
    
    return m.reply(displayBoard(gameData));
  }
  
  // Colocar/quitar bandera
  if (command === 'bandera') {
    if (!gameData.revealed[row][col]) {
      gameData.flagged[row][col] = !gameData.flagged[row][col];
      return m.reply(displayBoard(gameData));
    }
  }
  
  // Comando no reconocido
  m.reply('❌ Comando no válido. Usa: revelar, bandera o tablero');
};

handler.help = ['buscaminas'];
handler.tags = ['game'];
handler.command = ['buscaminas', 'minesweeper', 'minas'];
handler.fail = null;
handler.exp = 0;

export default handler;