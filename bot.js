/**
 * TELEGRAM BOT LAUNCHER (bot.js)
 * Легковесный бот на чистом Node.js (без тяжелых зависимостей).
 * Отправляет инлайн-кнопку для запуска Telegram Mini App.
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = 'https://vitaliynosov.github.io/Telegram-English-Bot/';

if (!token) {
  console.error('❌ ОШИБКА: Переменная TELEGRAM_BOT_TOKEN не задана.');
  console.log('Задайте её перед запуском:');
  console.log('PowerShell: $env:TELEGRAM_BOT_TOKEN="ВАШ_ТОКЕН"; node bot.js');
  console.log('CMD/Bash:   TELEGRAM_BOT_TOKEN=ВАШ_ТОКЕН node bot.js');
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${token}`;

async function sendStartMessage(chatId, firstName = 'friend') {
  const url = `${TELEGRAM_API}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: `👋 Hello, ${firstName}!\n\nWelcome to **DUO AI English Tutor** 🦉\nPractice English in real-world scenarios with instant speech recognition and voice feedback!\n\nTap the button below to start:`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🦉 Open Duo English Tutor',
            web_app: { url: WEB_APP_URL }
          }
        ]
      ]
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram API Error:', data);
    }
  } catch (err) {
    console.error('Failed to send message:', err.message);
  }
}

// Настройка кнопки меню чата (Menu Button)
async function setMenuButton() {
  const url = `${TELEGRAM_API}/setChatMenuButton`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Practice English 🦉',
          web_app: { url: WEB_APP_URL }
        }
      })
    });
    const data = await res.json();
    if (data.ok) {
      console.log('✅ Menu Button успешно настроена в Telegram!');
    }
  } catch (err) {
    console.warn('Could not set menu button automatically:', err.message);
  }
}

let offset = 0;

async function pollUpdates() {
  const url = `${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=30`;
  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        offset = update.update_id + 1;

        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text = update.message.text;
          const firstName = update.message.from?.first_name || 'there';

          if (text.startsWith('/start')) {
            console.log(`📩 Пользователь ${firstName} (${chatId}) нажал /start`);
            await sendStartMessage(chatId, firstName);
          }
        }
      }
    }
  } catch (e) {
    // Таймауты при поллинге нормальны
  }

  // Продолжаем поллинг
  setTimeout(pollUpdates, 500);
}

// Запуск
console.log('🤖 Telegram Bot запускается...');
console.log(`🌐 Ссылка на Mini App: ${WEB_APP_URL}`);

setMenuButton().then(() => {
  console.log('🚀 Бот слушает команду /start. Ожидание сообщений...');
  pollUpdates();
});
