/**
 * APP CONTROLLER (app.js)
 * Точка входа SPA-приложения:
 * - Управление экранами (Чат, Темы, Прогресс/История, Настройки)
 * - Персистентные сессии диалогов с историей и удалением
 * - Взаимодействие с Google Gemini API и Web Speech API
 */

// Стандартные приветствия для каждой темы
const TOPIC_STARTERS = {
  coffee_shop: {
    title: 'Coffee Shop',
    icon: 'fa-mug-hot',
    text: "Hi there! Welcome to our English practice. Let's imagine you just walked into a cozy coffee shop in New York. What would you like to order today?",
    tip: "Try using \"I'd like to get...\" or \"Could I have a...\" to sound extra polite!"
  },
  airport_travel: {
    title: 'Airport & Travel',
    icon: 'fa-plane',
    text: "Hello! Welcome to the international departure terminal. Where are you flying to today? May I see your ticket and passport?",
    tip: "You can say: \"I'm flying to London\" or \"Here is my boarding pass.\""
  },
  job_interview: {
    title: 'Job Interview',
    icon: 'fa-briefcase',
    text: "Good morning! Thank you for joining the interview today. To start off, could you tell me a little bit about yourself and your background?",
    tip: "Start confidently with: \"Sure, I have experience in...\""
  },
  small_talk: {
    title: 'Small Talk',
    icon: 'fa-comments',
    text: "Hey! What a great day today, isn't it? How has your week been going so far?",
    tip: "Natural answers: \"Not bad at all!\" or \"Pretty busy, but going well!\""
  },
  grammar_clinic: {
    title: 'Grammar Clinic',
    icon: 'fa-graduation-cap',
    text: "Welcome to Grammar Clinic! Share any English sentence you want to check, and we will practice and perfect it together.",
    tip: "Type any phrase you're unsure about and I will help you polish it!"
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Инициализация пользователя и хранилища
  const currentUser = window.telegramService.getUser();
  window.storageService.setUserId(currentUser.id);

  // 1.1 Инициализация темы оформления (Light по умолчанию / Dark #0E1621)
  initTheme();

  // Обновляем статистику в шапке
  initHeaderStats();

  // 2. Инициализация табов навигации
  initNavigation();

  // 3. Инициализация экрана чата и загрузка активной сессии
  initChatScreen();

  // 4. Инициализация экрана тем
  initTopicsScreen();

  // 5. Инициализация экрана прогресса и истории
  initProgressScreen();

  // 6. Инициализация экрана настроек
  initSettingsScreen();
});

/* ==========================================================================
   1. ШАПКА И СТАТИСТИКА
   ========================================================================== */
function initHeaderStats() {
  const stats = window.storageService.getStats();
  const streakEl = document.getElementById('stat-streak-val');
  const xpEl = document.getElementById('stat-xp-val');

  if (streakEl) streakEl.textContent = stats.streak;
  if (xpEl) xpEl.textContent = stats.xp;
}

function addXP(amount = 10) {
  const updated = window.storageService.incrementXP(amount);
  const xpEl = document.getElementById('stat-xp-val');
  if (xpEl) {
    xpEl.textContent = updated.xp;
    xpEl.parentElement.style.transform = 'scale(1.2)';
    setTimeout(() => {
      xpEl.parentElement.style.transform = 'scale(1)';
    }, 200);
  }

  // Обновляем общий прогресс если открыт экран прогресса
  const progressXp = document.getElementById('progress-total-xp');
  if (progressXp) progressXp.textContent = updated.xp;
}

/* ==========================================================================
   1.1 УПРАВЛЕНИЕ ТЕМОЙ ОФОРМЛЕНИЯ (LIGHT / DARK #0E1621)
   ========================================================================== */
function initTheme() {
  const currentTheme = window.storageService.getTheme() || 'light';
  applyThemeUI(currentTheme);

  // Быстрый переключатель в шапке
  const headerToggleBtn = document.getElementById('theme-toggle-btn');
  if (headerToggleBtn) {
    headerToggleBtn.addEventListener('click', () => {
      const activeTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
      const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
      switchTheme(newTheme);
      window.telegramService.hapticImpact('medium');
    });
  }

  // Выбор темы в настройках
  const themeOptionBtns = document.querySelectorAll('.theme-option-btn');
  themeOptionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedTheme = btn.getAttribute('data-theme');
      switchTheme(selectedTheme);
      window.telegramService.hapticSelection();
    });
  });
}

function switchTheme(theme) {
  window.storageService.setTheme(theme);
  window.telegramService.setTheme(theme);
  applyThemeUI(theme);
  showToast(theme === 'dark' ? 'Dark theme enabled (#0E1621)' : 'Light theme enabled');
}

function applyThemeUI(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }

  // Обновляем иконку кнопки в шапке
  const headerToggleBtn = document.getElementById('theme-toggle-btn');
  if (headerToggleBtn) {
    if (theme === 'dark') {
      headerToggleBtn.innerHTML = '<i class="fa-solid fa-sun icon-theme-sun"></i>';
      headerToggleBtn.setAttribute('title', 'Switch to Light Theme');
      headerToggleBtn.setAttribute('aria-label', 'Switch to Light Theme');
    } else {
      headerToggleBtn.innerHTML = '<i class="fa-solid fa-moon icon-theme-moon"></i>';
      headerToggleBtn.setAttribute('title', 'Switch to Dark Theme');
      headerToggleBtn.setAttribute('aria-label', 'Switch to Dark Theme');
    }
  }

  // Синхронизируем кнопки в экране настроек
  const themeOptionBtns = document.querySelectorAll('.theme-option-btn');
  themeOptionBtns.forEach(btn => {
    if (btn.getAttribute('data-theme') === theme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/* ==========================================================================
   2. НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ (SPA TABS)
   ========================================================================== */
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-tab-btn');
  const screens = document.querySelectorAll('.screen');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetScreenId = btn.getAttribute('data-screen');
      if (!targetScreenId) return;

      window.telegramService.hapticSelection();

      // Смена активной кнопки
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Смена активного экрана
      screens.forEach(screen => {
        if (screen.id === targetScreenId) {
          screen.classList.add('active');
        } else {
          screen.classList.remove('active');
        }
      });

      // Если открыли экран прогресса, обновляем список сессий
      if (targetScreenId === 'screen-progress') {
        renderProgressScreen();
      }
    });
  });

  // Кнопка быстрой смены темы из шапки чата
  const changeTopicBtn = document.getElementById('change-topic-btn');
  if (changeTopicBtn) {
    changeTopicBtn.addEventListener('click', () => {
      const topicsTabBtn = document.querySelector('[data-screen="screen-topics"]');
      if (topicsTabBtn) topicsTabBtn.click();
    });
  }

  // Кнопка создания нового диалога из шапки чата
  const newChatBtn = document.getElementById('new-chat-btn');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      window.telegramService.hapticImpact('medium');
      const settings = window.storageService.getSettings();
      const topicKey = settings.currentTopic || 'coffee_shop';
      const starter = TOPIC_STARTERS[topicKey] || TOPIC_STARTERS.coffee_shop;

      window.storageService.createSession(topicKey, starter.title, {
        text: starter.text,
        grammarTip: starter.tip
      });

      renderActiveSession();
      showToast('Started fresh practice session!');
    });
  }
}

/* ==========================================================================
   3. ЭКРАН ЧАТА И СЕССИЙ
   ========================================================================== */
function initChatScreen() {
  const chatForm = document.getElementById('chat-input-form');
  const chatInput = document.getElementById('chat-text-input');
  const chatMessages = document.getElementById('chat-messages-container');
  const micBtn = document.getElementById('btn-mic-record');

  if (!chatForm || !chatInput || !chatMessages) return;

  // Отрисовываем активную сессию (сохраняется между перезагрузками)
  renderActiveSession();

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    window.telegramService.hapticImpact('light');

    // 1. Отображаем сообщение пользователя и пишем в сессию
    appendUserMessage(text);
    window.storageService.addMessageToActiveSession(false, text);
    chatInput.value = '';

    // Начисляем XP за активность
    addXP(10);

    // 2. Отправляем в Gemini AI репетитору
    sendTutorMessage(text);
  });

  // Клик по микрофону для живой речи
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      window.telegramService.hapticImpact('medium');

      if (window.speechService.isListening) {
        window.speechService.stopListening();
        micBtn.classList.remove('recording');
        chatInput.placeholder = "Type your answer in English...";
        return;
      }

      const settings = window.storageService.getSettings();
      const accent = settings.voiceAccent || 'en-US';

      const started = window.speechService.startListening({
        lang: accent,
        onStart: () => {
          micBtn.classList.add('recording');
          chatInput.placeholder = "Listening... Speak in English";
          showToast('Listening... Speak now!');
        },
        onInterim: (text) => {
          chatInput.value = text;
        },
        onFinal: (text) => {
          chatInput.value = text;
          micBtn.classList.remove('recording');
          chatInput.placeholder = "Type your answer in English...";
          showToast('Speech captured!');

          if (text.trim().length > 0) {
            setTimeout(() => {
              if (chatInput.value.trim() === text.trim()) {
                chatForm.dispatchEvent(new Event('submit'));
              }
            }, 600);
          }
        },
        onEnd: () => {
          micBtn.classList.remove('recording');
          chatInput.placeholder = "Type your answer in English...";
        },
        onError: (err) => {
          micBtn.classList.remove('recording');
          chatInput.placeholder = "Type your answer in English...";
          showToast('Mic permission or recognition error');
        }
      });

      if (!started && !window.speechService.isSpeechRecognitionSupported()) {
        showToast('Microphone requires Chrome/Edge/Telegram WebView');
      }
    });
  }

  // Делегирование клика по кнопке звука
  chatMessages.addEventListener('click', (e) => {
    const audioBtn = e.target.closest('.audio-play-btn');
    if (audioBtn) {
      window.telegramService.hapticImpact('light');
      const textToPlay = audioBtn.getAttribute('data-text') || 'Hello! Welcome to English practice!';
      playTutorSpeech(textToPlay, audioBtn);
    }
  });
}

/**
 * Отрисовка всех сообщений текущей выбранной сессии
 */
function renderActiveSession() {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  container.innerHTML = '';
  let session = window.storageService.getActiveSession();

  // Если сессий нет вообще, создаем стартовую сессию
  if (!session || !session.messages || session.messages.length === 0) {
    const settings = window.storageService.getSettings();
    const topicKey = settings.currentTopic || 'coffee_shop';
    const starter = TOPIC_STARTERS[topicKey] || TOPIC_STARTERS.coffee_shop;
    session = window.storageService.createSession(topicKey, starter.title, {
      text: starter.text,
      grammarTip: starter.tip
    });
  }

  // Обновляем плашку темы в шапке чата
  updateActiveTopicHeader(session.topic, session.topicTitle);

  // Воспроизводим реплики диалога
  session.messages.forEach(msg => {
    if (msg.isBot) {
      appendBotMessage(msg.text, msg.grammarTip, false);
    } else {
      appendUserMessage(msg.text, false);
    }
  });

  scrollToBottom();
}

function updateActiveTopicHeader(topicKey, topicTitle) {
  const activeTopicText = document.getElementById('active-topic-text');
  const activeTopicIcon = document.querySelector('.topic-pill-icon');
  const topicIcons = {
    coffee_shop: 'fa-mug-hot',
    airport_travel: 'fa-plane',
    job_interview: 'fa-briefcase',
    small_talk: 'fa-comments',
    grammar_clinic: 'fa-graduation-cap'
  };

  if (activeTopicText) activeTopicText.textContent = topicTitle || 'Practice Session';
  if (activeTopicIcon) {
    activeTopicIcon.className = `fa-solid ${topicIcons[topicKey] || 'fa-mug-hot'} topic-pill-icon`;
  }
}

function appendUserMessage(text, scroll = true) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'message-row user';
  row.innerHTML = `
    <div class="user-avatar-badge" title="You">
      <i class="fa-solid fa-user"></i>
    </div>
    <div class="message-bubble">
      <p>${escapeHtml(text)}</p>
    </div>
  `;
  container.appendChild(row);
  if (scroll) scrollToBottom();
}

function appendBotMessage(text, grammarTip = null, scroll = true) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'message-row bot';

  let grammarHtml = '';
  if (grammarTip) {
    grammarHtml = `
      <div class="grammar-feedback-card">
        <div class="grammar-feedback-title">
          <i class="fa-solid fa-lightbulb icon-duo-green"></i> Duo's Pro Tip
        </div>
        <div>${escapeHtml(grammarTip)}</div>
      </div>
    `;
  }

  row.innerHTML = `
    <div class="message-avatar">
      <img src="assets/duo.png" alt="Duo Tutor" onerror="this.src='https://placehold.co/100x100/58CC02/FFFFFF?text=Duo'">
    </div>
    <div class="message-bubble">
      <p>${escapeHtml(text)}</p>
      <div class="message-actions">
        <button class="audio-play-btn" data-text="${escapeHtml(text)}">
          Listen
        </button>
      </div>
      ${grammarHtml}
    </div>
  `;
  container.appendChild(row);
  if (scroll) scrollToBottom();
}

function showTypingIndicator() {
  removeTypingIndicator();
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'message-row bot';
  row.id = 'tutor-typing-row';
  row.innerHTML = `
    <div class="message-avatar">
      <img src="assets/duo.png" alt="Duo">
    </div>
    <div class="message-bubble" style="padding: 10px 14px;">
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `;
  container.appendChild(row);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById('tutor-typing-row');
  if (el) el.remove();
}

async function sendTutorMessage(userText) {
  const settings = window.storageService.getSettings();
  const apiKey = settings.apiKey;

  if (!apiKey) {
    appendBotMessage(
      "Oops! Please open Settings and enter your free Google Gemini API key to start practicing!",
      "Tip: Go to Settings ➔ enter your key ➔ tap Save Settings."
    );
    showToast('Please enter API Key in Settings');
    return;
  }

  showTypingIndicator();

  try {
    const history = window.storageService.getHistory();
    const result = await window.aiService.sendMessage({
      text: userText,
      history: history,
      topic: settings.currentTopic || 'coffee_shop',
      level: settings.level || 'B1',
      apiKey: apiKey,
      model: settings.model || 'gemini-flash-lite-latest'
    });

    removeTypingIndicator();

    // Сохраняем ответ репетитора в активную сессию
    window.storageService.addMessageToActiveSession(true, result.reply, result.grammarTip);

    // Отрисовываем ответ
    appendBotMessage(result.reply, result.grammarTip);
    window.telegramService.hapticNotification('success');

    // Автоозвучка ответа, если включена в настройках
    if (settings.autoPlayAudio) {
      const allListenBtns = document.querySelectorAll('.audio-play-btn');
      const latestBtn = allListenBtns[allListenBtns.length - 1];
      if (latestBtn) {
        playTutorSpeech(result.reply, latestBtn);
      }
    }
  } catch (err) {
    removeTypingIndicator();
    console.error('Tutor error:', err);
    window.telegramService.hapticNotification('error');

    let errorAdvice = "Something went wrong. Please check your connection.";
    if (err.message && err.message.includes('429')) {
      errorAdvice = "Google Gemini rate limit reached. Please wait a few seconds and try again.";
      showToast('Limit reached (429)');
    } else {
      showToast('Connection error');
    }

    appendBotMessage(`Sorry! ${errorAdvice}`);
  }
}

function playTutorSpeech(text, buttonEl) {
  const settings = window.storageService.getSettings();
  window.speechService.speak(text, {
    accent: settings.voiceAccent || 'en-US',
    gender: settings.voiceGender || 'female',
    rate: 0.95,
    onStart: () => {
      if (buttonEl) {
        buttonEl.classList.add('playing');
        buttonEl.textContent = 'Speaking...';
      }
    },
    onEnd: () => {
      if (buttonEl) {
        buttonEl.classList.remove('playing');
        buttonEl.textContent = 'Listen';
      }
    },
    onError: (err) => {
      if (buttonEl) {
        buttonEl.classList.remove('playing');
        buttonEl.textContent = 'Listen';
      }
    }
  });
}

function scrollToBottom() {
  const container = document.getElementById('chat-messages-container');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

/* ==========================================================================
   4. ЭКРАН ТЕМ (TOPICS)
   ========================================================================== */
function initTopicsScreen() {
  const topicCards = document.querySelectorAll('.topic-card');

  topicCards.forEach(card => {
    card.addEventListener('click', () => {
      const topicKey = card.getAttribute('data-topic');
      const topicTitle = card.querySelector('h3').textContent;

      window.telegramService.hapticImpact('medium');

      topicCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      // Сохраняем тему в настройках
      window.storageService.saveSettings({ currentTopic: topicKey });

      // Создаем новую сессию под эту тему
      const starter = TOPIC_STARTERS[topicKey] || TOPIC_STARTERS.coffee_shop;
      window.storageService.createSession(topicKey, topicTitle, {
        text: starter.text,
        grammarTip: starter.tip
      });

      renderActiveSession();
      showToast(`Topic switched: ${topicTitle}`);

      // Автопереход в чат через 350мс
      setTimeout(() => {
        const chatTabBtn = document.querySelector('[data-screen="screen-chat"]');
        if (chatTabBtn) chatTabBtn.click();
      }, 350);
    });
  });
}

/* ==========================================================================
   5. ЭКРАН ПРОГРЕССА И ИСТОРИИ (PROGRESS & SESSIONS)
   ========================================================================== */
function initProgressScreen() {
  renderProgressScreen();

  const clearAllBtn = document.getElementById('btn-clear-all-history');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      window.telegramService.hapticNotification('warning');
      if (confirm('Clear all practice history?')) {
        window.storageService.clearAllSessions();
        renderProgressScreen();
        renderActiveSession();
        showToast('All practice history cleared');
      }
    });
  }
}

function renderProgressScreen() {
  const container = document.getElementById('progress-sessions-container');
  const totalPracticesEl = document.getElementById('progress-total-practices');
  const totalMessagesEl = document.getElementById('progress-total-messages');
  const totalXpEl = document.getElementById('progress-total-xp');
  const clearAllBtn = document.getElementById('btn-clear-all-history');

  if (!container) return;

  const stats = window.storageService.getStats();
  const sessions = window.storageService.getAllSessions();
  const currentSessionId = window.storageService.getCurrentSessionId();

  if (totalPracticesEl) totalPracticesEl.textContent = sessions.length;
  if (totalMessagesEl) totalMessagesEl.textContent = stats.messagesCount;
  if (totalXpEl) totalXpEl.textContent = stats.xp;

  if (clearAllBtn) {
    clearAllBtn.style.display = sessions.length > 0 ? 'block' : 'none';
  }

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-history-state">
        <div class="empty-history-icon"><i class="fa-solid fa-graduation-cap"></i></div>
        <div class="empty-history-title">No completed practices yet</div>
        <div class="empty-history-desc">Start your first conversation in the Chat to build your learning streak and track progress!</div>
        <button type="button" class="btn-3d btn-primary" id="btn-start-first-practice" style="padding: 8px 18px; font-size: 13px; margin: 0 auto;">
          Start Practice
        </button>
      </div>
    `;
    const startBtn = document.getElementById('btn-start-first-practice');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const chatTab = document.querySelector('[data-screen="screen-chat"]');
        if (chatTab) chatTab.click();
      });
    }
    return;
  }

  const topicIcons = {
    coffee_shop: 'fa-mug-hot',
    airport_travel: 'fa-plane',
    job_interview: 'fa-briefcase',
    small_talk: 'fa-comments',
    grammar_clinic: 'fa-graduation-cap'
  };

  container.innerHTML = '';
  sessions.forEach(session => {
    const isCurrent = session.id === currentSessionId;
    const iconClass = topicIcons[session.topic] || 'fa-mug-hot';
    const msgCount = session.messages ? session.messages.length : 0;
    const dateFormatted = formatSessionDate(session.createdAt || session.lastActivityAt);

    let preview = 'No messages yet';
    if (session.messages && session.messages.length > 0) {
      const lastMsg = session.messages[session.messages.length - 1];
      preview = (lastMsg.isBot ? 'Duo: ' : 'You: ') + lastMsg.text;
    }

    const card = document.createElement('div');
    card.className = `progress-session-card ${isCurrent ? 'active-session' : ''}`;
    card.setAttribute('data-id', session.id);

    card.innerHTML = `
      <div class="session-card-left">
        <div class="session-icon">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="session-info">
          <div class="session-title-row">
            <span class="session-title">${escapeHtml(session.topicTitle || 'Practice Session')}</span>
            <span class="session-date">${dateFormatted}</span>
          </div>
          <div class="session-meta-row">
            <span class="session-badge">${msgCount} msgs</span>
            <span class="session-preview-text">${escapeHtml(preview)}</span>
          </div>
        </div>
      </div>
      <button type="button" class="session-delete-btn" data-id="${session.id}" title="Delete session">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;

    // Клик по карточке открывает эту сессию в чате
    card.querySelector('.session-card-left').addEventListener('click', () => {
      window.telegramService.hapticImpact('medium');
      window.storageService.setCurrentSessionId(session.id);
      window.storageService.saveSettings({ currentTopic: session.topic });
      renderActiveSession();
      const chatTab = document.querySelector('[data-screen="screen-chat"]');
      if (chatTab) chatTab.click();
      showToast(`Opened: ${session.topicTitle}`);
    });

    // Клик по удалению
    card.querySelector('.session-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      window.telegramService.hapticNotification('warning');
      window.storageService.deleteSession(session.id);
      renderProgressScreen();
      // Если удалили открытую сейчас сессию, пересоздаем активную
      if (!window.storageService.getActiveSession()) {
        renderActiveSession();
      }
      showToast('Session deleted');
    });

    container.appendChild(card);
  });
}

function formatSessionDate(timestamp) {
  if (!timestamp) return 'Recently';
  const now = new Date();
  const date = new Date(timestamp);
  const diffHours = (now - date) / (1000 * 60 * 60);

  if (diffHours < 1) {
    const mins = Math.max(1, Math.round((now - date) / (1000 * 60)));
    return `${mins}m ago`;
  }
  if (diffHours < 24 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/* ==========================================================================
   6. ЭКРАН НАСТРОЕК (SETTINGS & BYOK)
   ========================================================================== */
function initSettingsScreen() {
  const settings = window.storageService.getSettings();

  const apiKeyInput = document.getElementById('settings-api-key');
  const toggleKeyBtn = document.getElementById('btn-toggle-key-visibility');
  const modelSelect = document.getElementById('settings-model');
  const voiceAccentSelect = document.getElementById('settings-voice-accent');
  const voiceGenderSelect = document.getElementById('settings-voice-gender');
  const saveBtn = document.getElementById('btn-save-settings');
  const testConnBtn = document.getElementById('btn-test-connection');
  const keyStatusBadge = document.getElementById('api-key-status-badge');

  if (apiKeyInput && settings.apiKey) {
    apiKeyInput.value = settings.apiKey;
    updateKeyBadge(true);
  } else {
    updateKeyBadge(false);
  }

  if (modelSelect && settings.model) modelSelect.value = settings.model;
  if (voiceAccentSelect && settings.voiceAccent) voiceAccentSelect.value = settings.voiceAccent;
  if (voiceGenderSelect && settings.voiceGender) voiceGenderSelect.value = settings.voiceGender;

  const autoPlayCheck = document.getElementById('settings-autoplay-audio');
  if (autoPlayCheck) {
    autoPlayCheck.checked = settings.autoPlayAudio !== false;
  }

  const levelBtns = document.querySelectorAll('.level-pill-btn');
  levelBtns.forEach(btn => {
    if (btn.getAttribute('data-level') === settings.level) {
      levelBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      window.telegramService.hapticSelection();
      levelBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Показать / скрыть пароль
  if (toggleKeyBtn && apiKeyInput) {
    toggleKeyBtn.addEventListener('click', () => {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleKeyBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
      } else {
        apiKeyInput.type = 'password';
        toggleKeyBtn.innerHTML = '<i class="fa-regular fa-eye"></i>';
      }
    });
  }

  // Кнопка сохранения настроек
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      window.telegramService.hapticNotification('success');

      const selectedLevelBtn = document.querySelector('.level-pill-btn.active');
      const level = selectedLevelBtn ? selectedLevelBtn.getAttribute('data-level') : 'B1';

      const updated = window.storageService.saveSettings({
        apiKey: apiKeyInput ? apiKeyInput.value.trim() : '',
        model: modelSelect ? modelSelect.value : 'gemini-flash-lite-latest',
        voiceAccent: voiceAccentSelect ? voiceAccentSelect.value : 'en-US',
        voiceGender: voiceGenderSelect ? voiceGenderSelect.value : 'female',
        autoPlayAudio: autoPlayCheck ? autoPlayCheck.checked : true,
        level: level
      });

      updateKeyBadge(!!(updated && updated.apiKey));
      showToast('Settings saved successfully!');
    });
  }

  // Кнопка проверки соединения (Реальный тест Gemini API)
  if (testConnBtn) {
    testConnBtn.addEventListener('click', async () => {
      const key = apiKeyInput ? apiKeyInput.value.trim() : '';
      const model = modelSelect ? modelSelect.value : 'gemini-flash-lite-latest';

      if (!key) {
        window.telegramService.hapticNotification('warning');
        showToast('Please enter an API key first');
        return;
      }

      window.telegramService.hapticImpact('medium');
      testConnBtn.disabled = true;
      testConnBtn.textContent = 'Testing connection...';

      try {
        await window.aiService.testConnection(key, model);
        testConnBtn.disabled = false;
        testConnBtn.textContent = 'Test Connection';
        window.telegramService.hapticNotification('success');
        updateKeyBadge(true, 'Gemini API Verified');
        showToast('Google Gemini API Connected');
      } catch (err) {
        testConnBtn.disabled = false;
        testConnBtn.textContent = 'Test Connection';
        window.telegramService.hapticNotification('error');
        updateKeyBadge(false, 'Check API Key');
        showToast(err.message.length > 45 ? err.message.slice(0, 45) + '...' : err.message);
      }
    });
  }
}

function updateKeyBadge(hasKey, customText = null) {
  const badge = document.getElementById('api-key-status-badge');
  if (!badge) return;

  if (hasKey) {
    badge.className = 'status-badge ok';
    badge.textContent = customText || 'Key Configured';
  } else {
    badge.className = customText ? 'status-badge error' : 'status-badge empty';
    badge.textContent = customText || 'No Key Set';
  }
}

/* ==========================================================================
   7. УТИЛИТЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   ========================================================================== */
function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    const container = document.createElement('div');
    container.className = 'toast-container';
    container.innerHTML = `<div id="app-toast" class="toast"></div>`;
    document.body.appendChild(container);
    toast = document.getElementById('app-toast');
  }

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function escapeHtml(string) {
  if (!string) return '';
  const div = document.createElement('div');
  div.textContent = string;
  return div.innerHTML;
}
