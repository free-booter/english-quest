# English Quest 🚀

A gamified English learning PWA that turns vocabulary practice into an addictive quest experience. Learn new words daily, practice listening and speaking, and track your progress with spaced repetition.

## 📌 Current Focus

v1 的核心学习闭环已经可用。当前优先优化三个主入口：

- **首页**：改成更清晰的今日任务中心。
- **赛道**：重做视觉层级和路径感，这是当前最需要提升的 UI 模块。
- **我的**：从设置菜单升级为学习档案和成就反馈。

真实 AI API、云同步、自定义词包等能力放到 v2。

## 📚 Documentation

| 文档 | 用途 |
| --- | --- |
| [`docs/README.md`](docs/README.md) | 文档中心和维护方式 |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | v1/v2 优先级和近期路线图 |
| [`docs/DOCS_GUIDE.md`](docs/DOCS_GUIDE.md) | Markdown 文档维护规则 |
| [`UI_OPTIMIZATION_PLAN.md`](UI_OPTIMIZATION_PLAN.md) | 首页、赛道、我的页面 UI 优化计划 |
| [`ILLUSTRATION_GUIDE.md`](ILLUSTRATION_GUIDE.md) | 插画资源规范和接入指南 |
| [`CLAUDE.md`](CLAUDE.md) | 开发上下文、阶段记录和 AI 协作说明 |

## 🎮 Features

### Core Learning Flow
- **📍 Stage Map**: Visualize your learning journey with an interactive progression map
- **🃏 Word Cards**: Click-to-flip cards showing word, pronunciation, meaning, and root hints
- **🎯 Smart Examples**: AI-generated example sentences, grammar points, and word extensions (mock data in v1)
- **🔊 Text-to-Speech**: Click speaker icons to hear pronunciation and examples
- **👂 Listening Practice**: Speed-adjustable listening exercises with immediate feedback
- **🎤 Speaking Practice**: Record and get scored on pronunciation clarity using speech recognition
- **📅 Daily Check-in**: GitHub-style activity calendar showing your learning streak
- **🔄 Spaced Repetition**: Automatic review queue using the Ebbinghaus forgetting curve (1→2→4→7→15→30 days)

### Technical Features
- ✅ **Fully Offline**: All data stored locally in IndexedDB
- ✅ **PWA Ready**: Add to home screen, works offline
- ✅ **Mobile First**: Optimized for iOS and Android
- ✅ **No Backend Required**: v1 is completely self-contained
- ✅ **Persistent Data**: Close and reopen - your progress is saved

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone or download the project
cd english-quest

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`. On mobile, scan the QR code or visit the same IP address from your phone.

### Build for Production

```bash
npm run build
```

Output is in `dist/`. Deploy to any static host (Netlify, Vercel, GitHub Pages, etc.).

## 📚 How to Use

### Daily Routine (10-15 minutes)

1. **Open App** → See today's review queue (if any)
2. **Do Your Reviews** (⏰ badge) → Words due for spaced repetition
3. **Learn New Stage** → Go to Map → Click current stage
4. **Word Learning Loop**:
   - Read the word card
   - Click speaker button to hear pronunciation
   - Flip card to see meaning + grammar hints
   - Switch to "例句" tab to see example sentences and grammar points
   - Click speaker on examples to hear them spoken
5. **Complete Stage** → Unlocks listening/speaking practice
6. **Practice Listening** → Multiple choice listening exercise
7. **Practice Speaking** → Read aloud and get scored
8. **Done** → Daily check-in recorded, words added to review queue

### Review Schedule
After you complete a stage:
- Words appear in review queue the next day
- Mark as correct → Goes to next interval (1→2→4→7→15→30 days)
- Mark as wrong → Resets to 1 day
- Follow the spacing intervals for maximum retention

## 🛠️ Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| **Framework** | React 19 + Vite 6 | Fast, modern, zero build config |
| **Language** | TypeScript | Type safety without overhead |
| **Styling** | UnoCSS | Atomic CSS, minimal bundle |
| **Routing** | React Router v7 | Industry standard |
| **State** | Zustand | Lightweight (not Redux) |
| **Storage** | Dexie.js (IndexedDB) | Offline + complex queries |
| **Animation** | Framer Motion | Polished UI interactions |
| **Visualization** | React Flow | Interactive stage map |
| **Speech** | Web Speech API | Native browser speech |
| **Icons** | Lucide React | Clean, lightweight icons |
| **PWA** | vite-plugin-pwa | Service Worker + offline |

## 📁 Project Structure

```
src/
├── pages/
│   ├── home/              # Home page (stats, check-in calendar)
│   ├── map/               # Stage progression map
│   ├── stage/             # Word learning interface
│   ├── listening/         # Listening practice
│   ├── speaking/          # Speaking practice
│   ├── review/            # Spaced repetition review
│   └── me/                # Settings & info
├── components/            # Reusable UI components
│   └── CheckInCalendar/   # Daily check-in calendar
├── db/                    # Dexie database schema + seed
├── stores/                # Zustand stores
├── tts/                   # Text-to-speech module
├── speech/                # Speech recognition module
├── ai/                    # AI mock data (v2: real API)
├── types/                 # TypeScript interfaces
└── styles.css             # Global styles + animations
```

## 🗄️ Data Model

### Tables
- **words**: Vocabulary items (word, phonetic, meaning, pos, rootHint, mastery)
- **packs**: Word packages (CET4, CET6, IELTS, TOEFL, custom)
- **stages**: Learning stages (5 stages per pack, 10 words each)
- **checkIns**: Daily learning records (date, words learned, streak)
- **reviews**: Spaced repetition queue (word, next review date, interval, fail count)
- **settings**: App preferences (TTS rate, daily goal, theme)

## 🎯 v1 Feature Checklist

### ✅ Completed
- [x] Stage-based learning progression
- [x] Word cards with flip animation
- [x] AI example sentences & grammar (mocked)
- [x] Text-to-speech for words & examples
- [x] Listening practice with speed control
- [x] Speaking practice with scoring
- [x] Daily check-in calendar
- [x] Spaced repetition review queue
- [x] Offline functionality
- [x] PWA manifest configured

### ⏳ Phase 9 (PWA Polish)
- [ ] PWA icon assets (192×192, 512×512)
- [ ] iOS splash screens
- [ ] Real device testing checklist
- [ ] README & documentation ✅ (done)

### 📅 v2 Features (Not in v1)
- [ ] Real AI API (DeepSeek / OpenAI)
- [ ] Listening fill-in-the-blank exercises
- [ ] Scenario dialogue practice
- [ ] Custom word pack creation
- [ ] Progress sync to cloud
- [ ] Native app wrappers (Capacitor / Electron)

## 🔧 Development

### Commands
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Type check with TypeScript
```

### Database
View IndexedDB in Chrome DevTools:
1. Open DevTools (F12)
2. Application → Storage → IndexedDB → EnglishQuestDB
3. See tables: words, packs, stages, checkIns, reviews, settings

### Adding More Words
Edit `src/data/cet4.json` and add new words to the array. Format:
```json
{
  "word": "abandon",
  "phonetic": "/əˈbændən/",
  "pos": "verb",
  "meaning": "放弃",
  "rootHint": "a- (去) + band (束缚) = 放弃束缚"
}
```

## 📱 PWA Installation

### iOS (Safari)
1. Open app in Safari
2. Tap Share → Add to Home Screen
3. Opens full-screen, offline capable

### Android (Chrome)
1. Open app in Chrome
2. Menu → Install app
3. Or: Tap banner "Install"
4. Opens full-screen, offline capable

## 🧪 Testing Checklist

- [ ] **Desktop**: Chrome, Firefox, Safari
- [ ] **Mobile**: iOS Safari, Android Chrome
- [ ] **Offline**: Disconnect WiFi, words still show
- [ ] **Data Persistence**: Close app, reopen, data intact
- [ ] **TTS**: Speaker buttons produce audio
- [ ] **Speech Recognition**: Microphone records and transcribes
- [ ] **Review Queue**: Words appear next day after completion
- [ ] **Spaced Repetition**: Correct answers space out reviews
- [ ] **Dark Mode**: App respects system dark mode (on roadmap)

## 🚨 Known Limitations

- **v1 AI is mocked** — Real API comes in v2
- **No audio feedback** — Dings/beeps on correct answers (v2)
- **No sync** — Progress stays local only
- **No native app** — Works as PWA only
- **English only** — UI and content in English + Chinese

## 📝 License

MIT — Use freely, modify, share. No commercial restrictions.

## 👋 Feedback & Contributions

This is a personal project. Suggestions welcome but not required.

---

**Current Version**: v0.0.1 (In Development)  
**Last Updated**: April 2026  
**Built with ❤️ using React + Vite**
