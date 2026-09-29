# 🦉 English AI Tutor • Telegram Mini App (Duolingo Style)

An interactive, gamified English learning **Telegram Mini App (TMA)** and responsive web application crafted in the vibrant, cheerful style of **Duolingo**. Powered by **Google Gemini AI** with real-time conversational roleplay, speech synthesis, microphone voice input, and persistent practice progress tracking.

Designed for a **100% free ($0) serverless deployment** on GitHub Pages using client-side BYOK (Bring-Your-Own-Key).

---

## ✨ Features

- **🦉 Duo AI Tutor Mascot**: An encouraging, in-character AI language coach roleplaying realistic everyday conversational scenarios.
- **⚡ Google Gemini AI Engine**: Direct, ultra-fast client-side communication with Google AI API featuring a resilient model cascade (`gemini-flash-lite-latest`, `gemini-3.5-flash-lite`, `gemini-3.8-flash`, and `gemma-4-26b-a4b-it`).
- **🎙️ Speech Synthesis & Voice Input (TTS & STT)**:
  - **Speech-to-Text (STT)**: Tap the microphone button to practice spoken English. Includes animated pulsing indicators and automatic submission.
  - **Text-to-Speech (TTS)**: Listen to any tutor message with customizable American (`en-US`) or British (`en-GB`) accents, male or female voices, and optional auto-play.
- **🎨 Authentic Duolingo Design System**:
  - Tactile, playful 3D buttons with authentic press feedback.
  - Signature color palette: `#58CC02` (Duo Green), `#46A302` (Shadows), `#1CB0F6` (Accent Blue), `#FF9600` (Orange), and `#FFC800` (XP Yellow).
  - Modern Font Awesome 6 vector icons in matching signature green theme.
  - Fully responsive mobile-first viewport with `100dvh` support and dark mode compatibility.
- **📊 Progress & Practice Session History**:
  - Multi-session dialogue archive saved in `localStorage` and isolated per Telegram User ID.
  - **Progress Tab**: Track completed practices, total exchanged messages, and accumulated XP.
  - **Dialogue Review**: Tap any past practice card to reopen and review the entire dialogue with grammar tips.
  - **Session Management**: Start a new practice anytime with the `New Practice` button, or delete unwanted sessions with one tap.
- **📱 Telegram WebApp SDK Integration**: Automatic viewport expansion, theme synchronization (light/dark mode), and tactile Haptic Feedback on button presses and notifications.
- **💸 $0 Cost Architecture**: Pure Vanilla JavaScript with zero npm build dependencies, perfectly suited for static GitHub Pages hosting.

---

## 🗂️ Conversational Practice Scenarios

1. ☕ **Coffee Shop Order** (A1-A2 • Beginner): Polite ordering of hot beverages, milk alternatives, and pastries.
2. ✈️ **Airport & Travel** (A1-A2 • Beginner): Check-in counters, luggage drops, security checkpoints, and boarding gates.
3. 💼 **Job Interview** (B2-C1 • Advanced): Professional introductions, discussing past experience, career strengths, and answering interview questions.
4. 💬 **Casual Small Talk** (B1-B2 • Intermediate): Casual banter about weekend plans, weather, and personal hobbies.
5. 🩺 **Grammar Clinic** (All Levels): Targeted grammar drills and sentence polishing.

---

## 📂 Project Structure

```
English-Telegram-AI-Bot/
├── public/                       # Static WebApp (GitHub Pages ready)
│   ├── index.html                # Single Page Application layout (4 tabs)
│   ├── assets/
│   │   └── duo.png               # Duo owl mascot avatar
│   ├── css/
│   │   └── style.css             # Duolingo design system, CSS variables & 3D buttons
│   └── js/
│       ├── app.js                # Main SPA router, chat controller & session manager
│       ├── ai-service.js         # Google Gemini AI client with model cascade
│       ├── speech-service.js     # Web Speech API (TTS synthesis & STT mic recognition)
│       ├── storage.js            # Persistent storage isolated by Telegram User ID
│       └── telegram.js           # Telegram WebApp SDK wrapper with haptics
├── server.js                     # Lightweight local Node.js development server
├── package.json                  # Project configuration and start scripts
├── .gitignore                    # Git ignore file (excludes node_modules & private docs)
└── README.md                     # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)

### 1. Clone & Run Locally

```bash
# Clone the repository
git clone https://github.com/VitaliyNosov/Telegram-English-Bot.git

# Enter project directory
cd Telegram-English-Bot

# Start the local development server
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🔑 Obtaining a Free Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account and click **"Create API Key"**.
3. Copy your API key.
4. In the app, navigate to the **Settings** tab (⚙️), paste your key into the **Google Gemini API Key** field, and tap **"Save Settings"**.
5. Use the **"Test Connection"** button to verify connectivity.

---

## 🧭 Iteration Roadmap

- [x] **Iteration 1: Shell & Duolingo UI System**: Completed responsive mobile frame, 3D buttons, mascot avatar, tab navigation.
- [x] **Iteration 2: Google Gemini AI Client**: Direct BYOK client with validation, model selection, and fallback cascade.
- [x] **Iteration 3: Speech Synthesis & Recognition**: Web Speech API audio playback (`Listen`) and microphone dictation (`STT`).
- [x] **Iteration 4: Conversational Roleplay & Pro Tips**: Character-bound Duo responses, structured grammar tips, and polite prompts.
- [x] **Iteration 5: Multi-Session Practice History & Progress**: Persistent dialogue storage, history review, session deletion, and XP metrics.
- [ ] **Iteration 6: Telegram Bot Launch & GitHub Pages Deployment**: grammY/Telegraf bot launcher with WebApp button and GitHub Pages automated publishing.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
