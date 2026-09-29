/**
 * AI SERVICE (Google AI Direct Client)
 * Прямой диалог с ИИ на чистом английском без лишних рассуждений.
 */

class AIService {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.modelCascade = [
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemma-4-26b-a4b-it'
    ];
  }

  /**
   * Проверка валидности API ключа
   */
  async testConnection(apiKey, preferredModel = 'gemini-flash-lite-latest') {
    if (!apiKey) {
      throw new Error('API key is empty');
    }

    const testModels = [preferredModel, ...this.modelCascade.filter(m => m !== preferredModel)];
    let lastError = null;

    for (const model of testModels) {
      try {
        const url = `${this.baseUrl}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
            generationConfig: { maxOutputTokens: 10 }
          }),
          signal: AbortSignal.timeout(10000)
        });

        const data = await response.json();

        if (response.ok) {
          return { success: true, workingModel: model };
        }

        if (response.status === 400 || response.status === 403) {
          throw new Error('Invalid API Key. Please verify key from Google AI Studio.');
        }

        lastError = data.error?.message || `HTTP ${response.status}`;
      } catch (err) {
        lastError = err.message;
        if (err.message && err.message.includes('Invalid API Key')) {
          throw err;
        }
      }
    }

    throw new Error(lastError || 'Unable to connect to Google API');
  }

  /**
   * Отправка сообщения и получение живого прямого ответа
   */
  async sendMessage({ text, history = [], topic = 'coffee_shop', level = 'B1', apiKey, model = 'gemini-flash-lite-latest' }) {
    if (!apiKey) {
      throw new Error('NO_API_KEY');
    }

    const systemInstruction = this.buildSystemPrompt(topic, level);

    // Формируем историю последних 4 реплик
    let transcript = '';
    const recentHistory = history.slice(-4);
    if (recentHistory.length > 0) {
      recentHistory.forEach(msg => {
        const speaker = msg.isBot ? 'Duo' : 'Student';
        transcript += `${speaker}: ${msg.text}\n`;
      });
    }

    transcript += `Student: ${text}\nDuo:`;

    const fullPrompt = `${systemInstruction}\n\n${transcript}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: fullPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 180
      }
    };

    const tryModels = [model, ...this.modelCascade.filter(m => m !== model)];
    let lastError = null;

    for (const currentModel of tryModels) {
      try {
        const url = `${this.baseUrl}/${currentModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });

        const data = await response.json();

        if (response.ok) {
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            return this.cleanResponse(rawText);
          }
        }

        lastError = data.error?.message || `HTTP ${response.status}`;
      } catch (e) {
        lastError = e.message;
      }
    }

    throw new Error(lastError || 'Service temporarily busy. Please try again.');
  }

  /**
   * Четкий промпт персонажа: Дуо отвечает прямо и дружелюбно
   */
  buildSystemPrompt(topic, level) {
    const topicScenarios = {
      coffee_shop: 'You are Duo (the cheerful green owl tutor). You are roleplaying as a friendly coffee shop barista practicing English with a student.',
      airport_travel: 'You are Duo (the cheerful green owl tutor). You are roleplaying as a helpful airport staff member practicing English with a student.',
      job_interview: 'You are Duo (the cheerful green owl tutor). You are roleplaying as an encouraging hiring manager conducting a casual English interview.',
      small_talk: 'You are Duo (the cheerful green owl tutor). You are roleplaying as a friendly neighbor having casual small talk.',
      grammar_clinic: 'You are Duo (the cheerful green owl tutor). You are roleplaying as an encouraging English tutor helping a student improve their language skills.'
    };

    const scenario = topicScenarios[topic] || topicScenarios.coffee_shop;

    return `${scenario}
Rules for Duo:
1. Always stay in character as Duo.
2. Directly answer any questions the student asks (e.g. your name, what you recommend, how you feel). If asked for your name, say your name is Duo!
3. Speak in 1-2 natural, warm sentences suitable for ${level} level learners.
4. End with a friendly question to encourage the student to speak.
5. Output ONLY your direct speech as Duo. Do not include notes, drafts, or bullet points.`;
  }

  /**
   * Очистка ответа и извлечение живой реплики без системных артефактов
   */
  cleanResponse(rawText) {
    if (!rawText) {
      return {
        reply: "Hi there! I'm Duo. How can I help you practice today?",
        grammarTip: null,
        correctedText: null
      };
    }

    let clean = rawText.trim();

    // 1. Если ответ прямой и чистый (стандартный режим Gemini)
    if (!clean.includes('\n*') && !clean.startsWith('*') && !clean.toLowerCase().startsWith('role:') && !clean.toLowerCase().startsWith('student:')) {
      clean = clean.replace(/^Duo:\s*/i, '').replace(/^["']|["']$/g, '').trim();
      return {
        reply: clean,
        grammarTip: null,
        correctedText: null
      };
    }

    // 2. Если модель вывела рассуждения с кавычками в конце (резервный случай Gemma)
    const quoteMatches = [...clean.matchAll(/"([^"]{10,250})"/g)];
    if (quoteMatches.length > 0) {
      for (let i = quoteMatches.length - 1; i >= 0; i--) {
        const q = quoteMatches[i][1].trim();
        if (!q.toLowerCase().startsWith('input:') && !q.toLowerCase().startsWith('hi what')) {
          return {
            reply: q.replace(/^Duo:\s*/i, '').trim(),
            grammarTip: null,
            correctedText: null
          };
        }
      }
    }

    // 3. Поиск последней содержательной строки
    const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (let i = lines.length - 1; i >= 0; i--) {
      let line = lines[i].replace(/^[\*\-\•\d\.]+\s*/, '').trim();
      if (!line) continue;
      if (/^(?:persona|roleplay|role|goal|rules?|input|draft|answer|maintain|follow-up|directly|constraint|context|grammar)/i.test(line)) continue;
      if (line.toLowerCase().startsWith('student:')) continue;
      if (line === 'Yes.' || line === 'No.' || line === 'Yes' || line === 'No') continue;

      line = line.replace(/^Duo:\s*/i, '').replace(/^["']|["']$/g, '').trim();
      if (line.length > 5) {
        return {
          reply: line,
          grammarTip: null,
          correctedText: null
        };
      }
    }

    return {
      reply: clean.replace(/[*#`]/g, '').trim(),
      grammarTip: null,
      correctedText: null
    };
  }
}

// Экспортируем глобальный синглтон
window.aiService = new AIService();
