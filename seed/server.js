import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import crypto from 'crypto';

// Определение путей
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Инициализация Express
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Список слов BIP-39 (сокращенный для примера)
const wordList = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
  'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
  'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
  'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
  'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter',
  'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger',
  'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
  'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic',
  'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest',
  'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset',
  'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
  'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake',
  'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon', 'badge',
  'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain'
];

// Инициализация базы данных
async function initializeDatabase() {
  const db = await open({
    filename: 'seed_phrases.db',
    driver: sqlite3.Database
  });

  // Создание таблицы, если она не существует
  await db.exec(`
    CREATE TABLE IF NOT EXISTS seed_phrases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phrase TEXT NOT NULL,
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
  } catch (error) {
    console.error('Database initialization error:', error);
  }
})();

// Функция для генерации случайной seed-фразы
function generateSeedPhrase() {
  const seedPhrase = [];

  for (let i = 0; i < 12; i++) {
    // Получаем случайное слово из списка
    const randomIndex = Math.floor(Math.random() * wordList.length);
    seedPhrase.push(wordList[randomIndex]);
  }

  return seedPhrase;
}

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Маршрут для генерации seed-фразы
app.get('/generate', (req, res) => {
  const seedPhrase = generateSeedPhrase();
  res.json({ phrase: seedPhrase.join(' ') });
});

// Маршрут для сохранения seed-фразы
app.post('/save', async (req, res) => {
  const { phrase } = req.body;

  if (!phrase) {
    return res.status(400).json({ error: 'Phrase is required' });
  }

  try {
    await db.run('INSERT INTO seed_phrases (phrase) VALUES (?)', phrase);
    res.json({ message: 'Phrase saved successfully' });
  } catch (error) {
    console.error('Error saving phrase:', error);
    res.status(500).json({ error: 'Failed to save phrase' });
  }
});

// Маршрут для получения всех seed-фраз
app.get('/phrases', async (req, res) => {
  try {
    const phrases = await db.all('SELECT * FROM seed_phrases');
    res.json(phrases);
  } catch (error) {
    console.error('Error fetching phrases:', error);
    res.status(500).json({ error: 'Failed to fetch phrases' });
  }
});

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
