const functions = require("firebase-functions");
const fetch = require("node-fetch");

// Ваш токен телеграм-бота
const TELEGRAM_BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Список известных населенных пунктов и их координат
const CITIES = {
  "киев": [30.5234, 50.4501],
  "львов": [24.0297, 49.8397],
  "одесса": [30.7233, 46.4825],
  "харьков": [36.2304, 49.9935],
  "днепр": [35.0462, 48.4647],
  // Добавьте другие города...
};

/**
 * Функция для обработки входящих сообщений от телеграм-бота
 * @param {Object} req - Объект запроса
 * @param {Object} res - Объект ответа
 */
exports.webhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const message = req.body.message;
  if (!message || !message.text) {
    return res.status(400).send("Invalid request");
  }

  const chatId = message.chat.id;
  const text = message.text.toLowerCase();

  // Поиск упоминаний городов в тексте
  let foundCity = null;
  for (const city in CITIES) {
    if (text.includes(city)) {
      foundCity = city;
      break;
    }
  }

  if (foundCity) {
    const coords = CITIES[foundCity];
    const postUrl = `https://t.me/your_channel/${message.message_id}`;

    // Добавляем маркер в Firebase Realtime Database
    const db = functions.database();
    await db.ref("markers").push({
      coords: coords,
      link: postUrl,
    });

    // Отправляем ответ пользователю
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: `Маркер добавлен для ${capitalize(foundCity)}!`,
      }),
    });

    return res.status(200).send("OK");
  } else {
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Город не найден.",
      }),
    });

    return res.status(200).send("OK");
  }
});

/**
 * Вспомогательная функция для капитализации первого символа строки
 * @param {string} str - Исходная строка
 * @return {string} - Строка с заглавной первой буквой
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
