/**
 * SPEECH SERVICE (SpeechService)
 * Мультимодальный речевой модуль:
 * 1. Text-to-Speech (TTS): естественный синтез речи с выбором акцента (US/UK) и пола голоса.
 * 2. Speech-to-Text (STT): живой голосовой ввод через микрофон с распознаванием английской речи.
 */

class SpeechService {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.voices = [];
    this.isListening = false;
    this.recognition = null;

    this.initVoices();
    this.initRecognition();
  }

  // =========================================================================
  // 1. СИНТЕЗ РЕЧИ (TEXT-TO-SPEECH)
  // =========================================================================

  initVoices() {
    if (!this.synth) return;

    const load = () => {
      this.voices = this.synth.getVoices().filter(v => v.lang.startsWith('en'));
      console.log(`Loaded ${this.voices.length} English voices`);
    };

    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  getAvailableVoices() {
    if (!this.synth) return [];
    if (this.voices.length === 0) {
      this.voices = this.synth.getVoices().filter(v => v.lang.startsWith('en'));
    }
    return this.voices;
  }

  findBestVoice(accent = 'en-US', gender = 'female') {
    const enVoices = this.getAvailableVoices();
    if (enVoices.length === 0) return null;

    // 1. Поиск по точному языку и предпочтению пола
    const langMatches = enVoices.filter(v => v.lang.replace('_', '-').toLowerCase().startsWith(accent.toLowerCase()));
    const candidates = langMatches.length > 0 ? langMatches : enVoices;

    const femaleKeywords = ['female', 'samantha', 'zira', 'karen', 'victoria', 'susan', 'catherine', 'google us english', 'f'];
    const maleKeywords = ['male', 'david', 'george', 'daniel', 'oliver', 'm'];

    const targetKeywords = gender === 'female' ? femaleKeywords : maleKeywords;

    for (const v of candidates) {
      const nameLower = v.name.toLowerCase();
      if (targetKeywords.some(kw => nameLower.includes(kw))) {
        return v;
      }
    }

    return candidates[0] || null;
  }

  speak(text, { accent = 'en-US', gender = 'female', rate = 0.95, onStart, onEnd, onError } = {}) {
    if (!this.synth) {
      if (onError) onError(new Error('Speech synthesis not supported on this device'));
      return;
    }

    // Останавливаем предыдущую озвучку
    this.stop();

    // Очищаем текст от Markdown тегов, звездочек и эмодзи для чистого произношения
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate;
    utterance.pitch = gender === 'female' ? 1.05 : 0.95;

    const voice = this.findBestVoice(accent, gender);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = accent;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (err) => {
      console.warn('Speech synthesis error:', err);
      if (onEnd) onEnd();
      if (onError) onError(err);
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
  }

  // =========================================================================
  // 2. РАСПОЗНАВАНИЕ РЕЧИ / МИКРОФОН (SPEECH-TO-TEXT)
  // =========================================================================

  initRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SpeechRec) {
      console.warn('SpeechRecognition API not natively available in this browser');
      return;
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;
    } catch (e) {
      console.warn('SpeechRecognition init error:', e);
    }
  }

  isSpeechRecognitionSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  startListening({ onInterim, onFinal, onStart, onEnd, onError, lang = 'en-US' } = {}) {
    if (!this.isSpeechRecognitionSupported()) {
      if (onError) onError(new Error('Speech recognition not supported in this browser. Please use Chrome/Edge or Telegram App.'));
      return false;
    }

    if (!this.recognition) {
      this.initRecognition();
    }

    if (this.isListening) {
      this.stopListening();
      return false;
    }

    this.recognition.lang = lang;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (onStart) onStart();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      if (interimTranscript && onInterim) {
        onInterim(interimTranscript);
      }

      if (finalTranscript && onFinal) {
        onFinal(finalTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('Speech recognition error event:', event.error);
      this.isListening = false;
      if (onError) onError(event);
      if (onEnd) onEnd();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      console.error('Recognition start error:', err);
      this.isListening = false;
      if (onError) onError(err);
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;
  }
}

// Экспортируем глобальный синглтон
window.speechService = new SpeechService();
