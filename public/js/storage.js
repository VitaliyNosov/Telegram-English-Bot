/**
 * STORAGE SERVICE (StorageService)
 * Обеспечивает изоляцию данных по ID пользователя Telegram.
 * Поддерживает сохранение истории сессий диалогов, удаление и отслеживание прогресса.
 */

class StorageService {
  constructor(userId = 'guest') {
    this.userId = userId;
    this.prefix = `engbot_u${this.userId}_`;
  }

  setUserId(userId) {
    this.userId = userId || 'guest';
    this.prefix = `engbot_u${this.userId}_`;
  }

  // --- Настройки приложения (API, модель, голос, уровень) ---
  getSettings() {
    try {
      const data = localStorage.getItem(`${this.prefix}settings`);
      if (!data) return this.getDefaultSettings();
      const parsed = JSON.parse(data);
      if (!parsed.apiKey) {
        parsed.apiKey = this.getDefaultSettings().apiKey;
      }
      if (!parsed.model || parsed.model === 'gemma-4-26b-a4b-it' || parsed.model.includes('2.5') || parsed.model.includes('1.5')) {
        parsed.model = 'gemini-flash-lite-latest';
      }
      return parsed;
    } catch (e) {
      console.warn('Storage read error, using defaults:', e);
      return this.getDefaultSettings();
    }
  }

  saveSettings(newSettings) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...newSettings };
      localStorage.setItem(`${this.prefix}settings`, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Storage save error:', e);
      return null;
    }
  }

  getTheme() {
    try {
      return localStorage.getItem('engbot_theme') || localStorage.getItem(`${this.prefix}theme`) || 'light';
    } catch (e) {
      return 'light';
    }
  }

  setTheme(theme) {
    try {
      const mode = theme === 'dark' ? 'dark' : 'light';
      localStorage.setItem('engbot_theme', mode);
      localStorage.setItem(`${this.prefix}theme`, mode);
      return mode;
    } catch (e) {
      return 'light';
    }
  }

  getDefaultSettings() {
    return {
      apiKey: '',
      model: 'gemini-flash-lite-latest',
      level: 'B1', // A1, A2, B1, B2, C1
      voiceAccent: 'en-US', // en-US или en-GB
      voiceGender: 'female',
      autoPlayAudio: true,
      currentTopic: 'coffee_shop'
    };
  }

  // --- Управление сессиями диалогов (Practice Sessions) ---
  getAllSessions() {
    try {
      const data = localStorage.getItem(`${this.prefix}sessions`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Sessions read error:', e);
      return [];
    }
  }

  saveAllSessions(sessions) {
    try {
      localStorage.setItem(`${this.prefix}sessions`, JSON.stringify(sessions));
    } catch (e) {
      console.error('Sessions save error:', e);
    }
  }

  getCurrentSessionId() {
    return localStorage.getItem(`${this.prefix}current_session_id`) || null;
  }

  setCurrentSessionId(id) {
    if (id) {
      localStorage.setItem(`${this.prefix}current_session_id`, id);
    } else {
      localStorage.removeItem(`${this.prefix}current_session_id`);
    }
  }

  getActiveSession() {
    const currentId = this.getCurrentSessionId();
    const sessions = this.getAllSessions();
    if (currentId) {
      const found = sessions.find(s => s.id === currentId);
      if (found) return found;
    }
    // Если сессия не найдена, но есть сохранённые сессии
    return sessions.length > 0 ? sessions[0] : null;
  }

  createSession(topicKey = 'coffee_shop', topicTitle = 'Coffee Shop Order', starterMessage = null) {
    const id = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newSession = {
      id,
      topic: topicKey,
      topicTitle: topicTitle,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      xpEarned: 0,
      messages: []
    };

    if (starterMessage) {
      newSession.messages.push({
        isBot: true,
        text: starterMessage.text,
        grammarTip: starterMessage.grammarTip || null,
        timestamp: Date.now()
      });
    }

    const sessions = this.getAllSessions();
    sessions.unshift(newSession);
    this.saveAllSessions(sessions);
    this.setCurrentSessionId(id);
    return newSession;
  }

  addMessageToActiveSession(isBot, text, grammarTip = null) {
    let session = this.getActiveSession();
    if (!session) {
      const settings = this.getSettings();
      const topicTitles = {
        coffee_shop: 'Coffee Shop Order',
        airport_travel: 'Airport & Travel',
        job_interview: 'Job Interview',
        small_talk: 'Casual Small Talk',
        grammar_clinic: 'Grammar Clinic'
      };
      session = this.createSession(settings.currentTopic, topicTitles[settings.currentTopic] || 'Practice Session');
    }

    const msgObj = {
      isBot: !!isBot,
      text,
      grammarTip: grammarTip || null,
      timestamp: Date.now()
    };

    session.messages.push(msgObj);
    session.lastActivityAt = Date.now();
    if (!isBot) {
      session.xpEarned = (session.xpEarned || 0) + 10;
    }

    const sessions = this.getAllSessions();
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx !== -1) {
      sessions[idx] = session;
    } else {
      sessions.unshift(session);
    }
    this.saveAllSessions(sessions);
    return session;
  }

  deleteSession(sessionId) {
    let sessions = this.getAllSessions();
    sessions = sessions.filter(s => s.id !== sessionId);
    this.saveAllSessions(sessions);

    if (this.getCurrentSessionId() === sessionId) {
      const nextSession = sessions.length > 0 ? sessions[0].id : null;
      this.setCurrentSessionId(nextSession);
    }
    return sessions;
  }

  clearAllSessions() {
    localStorage.removeItem(`${this.prefix}sessions`);
    this.setCurrentSessionId(null);
  }

  // --- Совместимость с контекстом AI ---
  getHistory() {
    const session = this.getActiveSession();
    if (!session || !session.messages) return [];
    // Возвращаем последние 6 сообщений для контекста ИИ
    return session.messages.slice(-6).map(m => ({
      isBot: m.isBot,
      text: m.text
    }));
  }

  // --- Игровые параметры (Серия дней Streak, XP, Сообщения) ---
  getStats() {
    try {
      const data = localStorage.getItem(`${this.prefix}stats`);
      const baseStats = data ? JSON.parse(data) : { streak: 3, xp: 120, messagesCount: 0 };
      
      // Считаем реальное число сообщений и сессий
      const sessions = this.getAllSessions();
      let totalMsgs = 0;
      sessions.forEach(s => {
        if (s.messages) totalMsgs += s.messages.length;
      });

      return {
        streak: baseStats.streak || 3,
        xp: baseStats.xp || 120,
        messagesCount: Math.max(baseStats.messagesCount || 0, totalMsgs),
        sessionsCount: sessions.length
      };
    } catch (e) {
      return { streak: 3, xp: 120, messagesCount: 0, sessionsCount: 0 };
    }
  }

  incrementXP(amount = 10) {
    const stats = this.getStats();
    stats.xp += amount;
    stats.messagesCount += 1;
    localStorage.setItem(`${this.prefix}stats`, JSON.stringify(stats));
    return stats;
  }
}

// Экспортируем глобальный синглтон
window.storageService = new StorageService();
