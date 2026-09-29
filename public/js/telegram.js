/**
 * TELEGRAM WEBAPP WRAPPER (TelegramService)
 * Безопасная работа с Telegram WebApp SDK.
 * Корректно работает и внутри Telegram, и в обычном браузере (мок/фоллбэк для разработки).
 */

class TelegramService {
  constructor() {
    this.tg = window.Telegram ? window.Telegram.WebApp : null;
    this.init();
  }

  init() {
    if (this.tg) {
      try {
        // Разворачиваем окно Mini App на весь экран
        this.tg.ready();
        this.tg.expand();

        // Цвета заголовка и фона
        if (this.tg.setHeaderColor) {
          this.tg.setHeaderColor('#58CC02');
        }

        // Поддержка смены темы (Dark / Light)
        this.applyTheme();
        this.tg.onEvent('themeChanged', () => this.applyTheme());

        console.log('Telegram WebApp initialized successfully for user:', this.getUser());
      } catch (err) {
        console.warn('Telegram WebApp init warning:', err);
      }
    } else {
      console.log('Running outside Telegram WebApp. Browser mock mode activated.');
    }
  }

  // Получить данные текущего пользователя
  getUser() {
    if (this.tg && this.tg.initDataUnsafe && this.tg.initDataUnsafe.user) {
      return this.tg.initDataUnsafe.user;
    }
    return {
      id: 'local_dev',
      first_name: 'You',
      username: 'student',
      language_code: 'en'
    };
  }

  // Применение темы
  applyTheme() {
    if (this.tg && this.tg.colorScheme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  // Тактильный отклик (Haptic Feedback) в стиле Duolingo
  hapticImpact(style = 'light') {
    // style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
    if (this.tg && this.tg.HapticFeedback) {
      try {
        this.tg.HapticFeedback.impactOccurred(style);
      } catch (e) {}
    }
  }

  hapticNotification(type = 'success') {
    // type: 'error' | 'success' | 'warning'
    if (this.tg && this.tg.HapticFeedback) {
      try {
        this.tg.HapticFeedback.notificationOccurred(type);
      } catch (e) {}
    }
  }

  hapticSelection() {
    if (this.tg && this.tg.HapticFeedback) {
      try {
        this.tg.HapticFeedback.selectionChanged();
      } catch (e) {}
    }
  }
}

// Экспортируем глобальный синглтон
window.telegramService = new TelegramService();
