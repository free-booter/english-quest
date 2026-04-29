# English Quest - 开发上下文

## 📱 项目概览

**English Quest** 是一款移动端**综合英语学习 PWA**，以场景化词汇为基础，后续扩展口语、语法、听力。

- **主要目标**：通过兴趣主题 + 等级系统 + 多模式学习，帮助用户在真实场景中学习并运用英语
- **用户定位**：有具体使用场景需求的学习者（出行、追剧、职场面试等）
- **核心理念**：语境例句优先、专注单一主题、全功能免费
- **核心特色**：2 个活跃主题、6 个可爱头像、打卡系统、间隔重复复习

## 🛠 技术栈

```
React 19 + Vite 6 + TypeScript (strict mode)
UnoCSS (原子化 CSS)
Dexie.js (IndexedDB 离线存储)
Zustand (状态管理)
React Router v7
Framer Motion (动画)
React Flow (舞台地图可视化)
Web Speech API (TTS + 语音识别)
vite-plugin-pwa (PWA 支持)
```

## 📊 当前架构

### 数据模型（4 层树形结构）
```
Track (主题) → Level (等级) → Chapter (章节) → Stage (舞台) → Card (卡片)
├─ 🌍 旅行家 (Travel, #3b82f6 blue)  ← 活跃
│  ├─ L1: 行李机场（词库补全中）
│  ├─ L2: 住宿交通
│  └─ L3: 饮食购物
├─ 🎬 追剧党 (Drama, #a855f7 purple)  ← 活跃
│  ├─ L1: 问候情绪
│  ├─ L2: 家庭恋爱
│  └─ L3: 职场社交
└─ 📚 应试派 (Exam)  ← 已隐藏，词汇融入旅行/追剧高等级关卡
```

### 6 个头像
🦊 狐狸 | 🐱 猫咪 | 🐻 熊 | 🐧 企鹅 | 🦉 猫头鹰 | 🐯 老虎

## ✅ 已完成工作

- [x] **Phase 1-5**：核心界面 (首页、轨道地图、舞台卡片、复习、成就)
- [x] **PLAN_V2.md**：3 轨道系统完整规划
- [x] **seed.ts 重构**：轨道、章节、舞台、词汇初始化
- [x] **router.tsx 更新**：新增 /tracks, /track/:trackId, /chapter/:chapterId, /achievements 路由
- [x] **HomePage 增强**：头像 + 昵称、轨道卡片、推荐词汇
- [x] **StagePage 优化**：轨道背景色、+20 XP 动画、导航到 /tracks

### 关键文件
- `src/data/tracks/{travel,drama,exam}.json` — 轨道词汇数据
- `src/db/seed.ts` — 初始化脚本（轨道、章节、舞台、词汇、设置、成就）
- `src/constants/game.ts` — 头像常量
- `src/pages/home/HomePage.tsx` — 首页（包含轨道选择）
- `src/pages/stage/StagePage.tsx` — 舞台页面（卡片模式）

## 🎯 当前任务：边学边练模式实施（A+B 混搭升级版）

### 核心决策：流畅的"边学边练"体验
1. **学练融合**：用户在学习流程中主动学词汇，而不是"看完再答题"
2. **轨道分工**：
   - 🎬 **追剧党** → 对话模式（Dialogue）：观看对话 → 点击单词学 → 自然理解 → 答题巩固
   - 🌍 **旅行家** → 场景模式（Scene）：探索插画 → 点击热点学 → 收集词汇 → 答题检验
   - 📚 **应试派** → 卡片模式（Card）：保持现有高效刷题设计
3. **核心改进**：单词点击即学（支持音频、释义、提示），学习记录自动追踪

### 需要实施的内容

#### 1️⃣ 数据结构扩展
```typescript
// Stage 新增字段 & 对话/场景数据引用
interface Stage {
  id: string
  // ... 现有字段
  modes: ('card' | 'dialogue' | 'scene')[]
  defaultMode: 'card' | 'dialogue' | 'scene'
  dialogueId?: string  // 对话脚本 ID（若支持对话模式）
  sceneId?: string     // 场景数据 ID（若支持场景模式）
}

// Chapter 新增插画
interface Chapter {
  id: string
  // ... 现有字段
  illustration?: string  // 背景插画 /illustrations/{trackId}/ch{level}.png
}

// 对话脚本结构
interface Dialogue {
  id: string
  stageId: string
  intro: string
  lines: DialogueLine[]
  questions: ComprehensionQuestion[]
}

interface DialogueLine {
  id: string
  speaker: string
  text: string          // 对话文本（支持单词高亮标记）
  audio: string
  wordsInLine: string[] // 该句中的词汇 ID 列表（用于点击学习）
}

// 场景数据结构
interface Scene {
  id: string
  stageId: string
  illustration: string  // 插画路径
  intro: string
  hotspots: Hotspot[]
  questions: ComprehensionQuestion[]
}

interface Hotspot {
  id: string
  x: number
  y: number
  radius: number
  wordId: string        // 关联的词汇 ID（用于学习记录）
  hint: string          // 场景提示（如"乘客在这里办理登机"）
}

interface ComprehensionQuestion {
  id: string
  prompt: string
  relatedItems: string[] // 相关的对话行 ID 或热点 ID
  options: string[]
  correctOption: string
}
```

#### 2️⃣ 核心组件设计

**DialogueStage.tsx** — 对话学习模式
```
┌─────────────────────────────────────┐
│  ← 章节 · 舞台  [模式选择按钮]       │  (顶部导航)
├─────────────────────────────────────┤
│  场景导入：在咖啡馆，两个朋友...     │
│  [开始对话] (or 自动进入)           │
├─────────────────────────────────────┤
│  Alice:                              │
│  "Hi, how have **you** been?"        │  ← 单词可点击高亮
│  [音频播放按钮]                      │
│  ─────────────────────────────────  │
│  Bob:                                │
│  "I've been great, thanks for..."   │
├─────────────────────────────────────┤
│  [点击单词时弹出]                    │
│  ┌─────────────────────────────────┐│
│  │ you [juː]                        ││
│  │ pron. 你                         ││
│  │ [音频播放] [标记复习] [关闭]    ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  所有对话读完后 → 理解题             │
│  Q: Alice 问 Bob 什么?              │
│  ○ How long have you been...       │
│  ○ How have you been?              │
│  ○ What have you...                │
└─────────────────────────────────────┘
```

**SceneStage.tsx** — 场景探索模式
```
┌─────────────────────────────────────┐
│  ← 章节 · 舞台  [模式选择按钮]       │
├─────────────────────────────────────┤
│  [插画：机场场景]                    │
│    ●Check-in Counter (热点)         │
│    ●Luggage (热点)                  │
│    ●Gate (热点)                     │
│                                      │
│  提示：点击热点学习相关词汇          │
│  已学词汇：0/3                       │
├─────────────────────────────────────┤
│  [点击热点时弹出]                    │
│  ┌─────────────────────────────────┐│
│  │ Check-in Counter [tʃek ɪn]       ││
│  │ 办理登机手续 (n.)                ││
│  │ 场景提示：航空公司柜台...        ││
│  │ [音频] [标记复习] [关闭]        ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  收集完所有热点后 → 理解题            │
│  Q: 你在哪里办理登机?               │
│  ○ Check-in Counter                │
│  ○ Gate                             │
│  ○ Lounge                           │
└─────────────────────────────────────┘
```

#### 3️⃣ 词汇卡片交互组件
**WordCard.tsx** — 浮窗式词汇卡片
- 显示：单词、音标、词性、中文释义、场景提示
- 交互：音频播放、标记复习（加入复习队列）、关闭
- 特性：点击外部自动关闭，支持快捷键（如 ESC）

#### 4️⃣ 数据文件格式

**对话脚本** (`src/data/dialogues/{trackId}-{chapterId}-{stageId}.json`)：
```json
{
  "id": "drama-ch1-st1",
  "stageId": "drama-ch1-st1",
  "intro": "在咖啡馆里，两个朋友在寒暄...",
  "lines": [
    {
      "id": "d1",
      "speaker": "Alice",
      "text": "Hi, how have you been?",
      "audio": "/audio/drama-ch1-st1/d1.mp3",
      "wordsInLine": ["w_you", "w_how", "w_been"]
    },
    {
      "id": "d2",
      "speaker": "Bob",
      "text": "I've been great, thanks for asking!",
      "audio": "/audio/drama-ch1-st1/d2.mp3",
      "wordsInLine": ["w_been", "w_great", "w_thanks"]
    }
  ],
  "questions": [
    {
      "id": "q1",
      "prompt": "Alice 在问什么?",
      "relatedItems": ["d1"],
      "options": ["How long have you been here?", "How have you been?", "What have you been doing?"],
      "correctOption": "How have you been?"
    }
  ]
}
```

**场景数据** (`src/data/scenes/{trackId}-{chapterId}-{stageId}.json`)：
```json
{
  "id": "travel-ch1-st1",
  "stageId": "travel-ch1-st1",
  "illustration": "/illustrations/travel/ch1/airport.png",
  "intro": "你到达了机场，这是出国旅行的第一步。点击画面中的热点来学习相关词汇吧！",
  "hotspots": [
    {
      "id": "h1",
      "x": 250,
      "y": 100,
      "radius": 40,
      "wordId": "w_checkin",
      "hint": "这是航空公司的柜台，乘客在这里提交行李和登机证"
    },
    {
      "id": "h2",
      "x": 150,
      "y": 250,
      "radius": 35,
      "wordId": "w_luggage",
      "hint": "乘客携带的行李和箱子"
    }
  ],
  "questions": [
    {
      "id": "q1",
      "prompt": "在机场，你在哪里办理登机手续?",
      "relatedItems": ["h1"],
      "options": ["Check-in Counter", "Gate", "Lounge"],
      "correctOption": "Check-in Counter"
    }
  ]
}
```

#### 5️⃣ 学习进度追踪
- **已学词汇记录**：用户点击词汇时，记录到 `learnedWords` 数组
- **自动检测完成条件**：
  - 对话模式：读完全部对话行 → 自动进入理解题
  - 场景模式：点击完全部热点 → 自动进入理解题
- **答题后**：无论何种模式，完成题目后都有 +20 XP 和星级评分

#### 6️⃣ 实施顺序（预计 3.5 天）

| 步骤 | 任务 | 工时 | 优先级 |
|------|------|------|--------|
| 1 | 扩展 Stage / Chapter / Word 类型，更新 seed.ts | 0.5h | 🔴 必须 |
| 2 | 实现 WordCard.tsx 词汇学习浮窗组件 | 1h | 🔴 必须 |
| 3 | 为 3 个轨道编写对话脚本 JSON 数据 | 1.5h | 🟠 高 |
| 4 | 实现 DialogueStage.tsx（含单词点击学习） | 2h | 🔴 必须 |
| 5 | 为 3 个轨道编写场景热点 JSON 数据 | 1.5h | 🟠 高 |
| 6 | 实现 SceneStage.tsx（含热点点击学习） | 2h | 🔴 必须 |
| 7 | CardStage.tsx 拆分（保留现有卡片模式） | 0.5h | 🟡 中 |
| 8 | StagePage 改造为模式路由 + 切换 UI | 1h | 🔴 必须 |
| 9 | 集成 + 浏览器测试 + 调试 | 1h | 🟡 中 |
| **总计** | | **11h (~3.5-4 天)** | |

## 🔄 第二阶段改进（2026-04-27 重构）

用户反馈截图中卡片模式存在的问题：
1. **题目干扰项跨语义域**：追剧情绪题目出现 immigration/theory/checkout（旅行/考试词汇）
2. **盲猜而非学习**：用户答题前看不到词义，属于猜测而非理解
3. **学练分离**：没有"先学后答"的流程

### 实施改进

**改动 1 — 词汇数据升级** ✅
- `drama.json`、`travel.json`、`exam.json` 中词汇从字符串改为对象格式
- 每个词汇包含：`word`、`phonetic`（音标）、`pos`（词性）、`meaning`（中文释义）
- 例：`{"word": "amazing", "phonetic": "[əˈmeɪzɪŋ]", "pos": "adj.", "meaning": "令人惊叹的"}`

**改动 2 — seed.ts 更新** ✅
- 支持新的词汇格式（字符串或对象）
- 初始化时正确读取 `phonetic`、`pos`、`meaning` 字段

**改动 3 — 干扰项改进** ✅
- 硬编码场景：用同语义域词汇替换跨轨道词汇
  - `drama-ch1-st1`：寒暄词 → 寒暄词
  - `drama-ch2-st1`：情绪词 → 情绪词（amazing/awesome/excited/relieved）
  - `travel-ch1-st1`：旅行词 → 旅行词
  - `exam-ch1-st1`：动词 → 动词
- `buildDistractors` 函数：从随机打乱后的词汇池中取，而非总是前 3 个

**改动 4 — CardStage 添加学习阶段** ✅
学习流程改为：`intro → learning → quiz → summary`

**learning 阶段**（核心改进）：
```
顶部显示：词汇学习 1/10
┌─────────────────┐
│  amazing        │  <- 英文单词（大字体）
│  [əˈmeɪzɪŋ]     │  <- 音标
│  [听发音按钮]   │
├─────────────────┤
│ 词性：adj.      │
│ 释义：令人惊叹的 │
└─────────────────┘
   [下一个词汇 (2/10)]  或  [全部学完，开始答题 →]
```

**quiz 阶段**（简化）：
- 用户已学完所有词汇，此时答题更有根据
- 选择后立即显示反馈 + 词义说明（强化记忆）

### 对比改进

| 方面 | 改进前 | 改进后 |
|------|-------|-------|
| **进入学习** | 首页 → 轨道 → 章节 → 舞台 | 首页推荐 → 直接进舞台 |
| **答题体验** | 直接看题→猜答案 | 先学词汇 → 理解答题 |
| **干扰项** | 跨轨道混乱（immigration 在追剧题） | 同语义域有意义（情绪词互相区分） |
| **词汇展示** | "追剧党场景词汇"（无释义） | 单词 + 音标 + 词性 + 释义 |
| **学习流程** | 3 阶段（导入→答题→反馈） | 4 阶段（导入→**学习**→答题→反馈） |

---

## 📋 约定 & 偏好

- **命名**：驼峰命名（React 组件用 PascalCase）
- **代码风格**：简洁、无过度注释，WHY 非显而易见才注释
- **抽象层级**：避免过度设计，只实现任务需求
- **测试**：UI 须在浏览器中验证，不依赖纯单元测试

## 🔗 关键文件导航

```
d:\yunfan\english-quest\
├── PLAN_V2.md                          # v2 整体规划（已完成）
├── ILLUSTRATION_GUIDE.md               # 插画资源指南（参考用）
├── src/
│   ├── db/
│   │   ├── db.ts                       # Dexie 数据库定义
│   │   └── seed.ts                     # 初始化脚本
│   ├── types/index.ts                  # 所有类型定义
│   ├── constants/game.ts               # 头像、颜色常量
│   ├── pages/
│   │   ├── home/HomePage.tsx           # 首页
│   │   ├── stage/StagePage.tsx         # 舞台页（待改造）
│   │   ├── review/ReviewPage.tsx       # 复习页
│   │   └── ... (其他页面)
│   ├── data/
│   │   ├── tracks/
│   │   │   ├── travel.json             # 旅行轨道词汇
│   │   │   ├── drama.json              # 追剧轨道词汇
│   │   │   └── exam.json               # 应试轨道词汇
│   │   ├── dialogues/                  # 对话脚本（待创建）
│   │   ├── scenes/                     # 场景热点（待创建）
│   │   └── stage-scenarios.ts          # 舞台场景数据
│   └── router.tsx
└── public/illustrations/                # 插画资源（待补充）
```

## 💡 决策历史（为何这样做）

- **为何多轨道？**→ 用户可选感兴趣的主题，提升留存
- **为何 A+B 混搭？** → 卡片式学习枯燥，对话 + 场景更有代入感
- **为何用真实插画？** → Emoji + 文字显得"AI 味重"，插画更专业
- **为何保留卡片模式？** → 应试派学生可能仍需高效刷题
- **为何用户可切换模式？** → 增加灵活性，满足不同学习风格

## 🚀 后续计划

- Phase 10：插画集成（从 Storyset / unDraw 下载）
- Phase 11：语音识别 (Web Speech API 口语练习)
- Phase 12：社交 & 排行榜
- Phase 13：国际化 (i18n)

---

## ✅ Phase 9：完整的"边学边练"学习体验（2026-04-27）

### 核心改进

**问题**：之前用户学习流程是 首页 → 选赛道 → 选章节 → 选舞台（多层选择，繁琐）

**解决方案**：
1. **推荐舞台卡片**：首页直接显示下一个待学舞台，一键进入 `/stage/:stageId`
2. **随机挑战**：点击"随机挑战"按钮快速开始任意舞台学习
3. **对话/场景学习**：支持多学习模式，词汇可点击即学

### 已完成工作

| 步骤 | 任务 | 状态 |
|------|------|------|
| 1 | HomePage 新增推荐舞台卡片（下一个待学舞台） | ✅ |
| 2 | 添加随机挑战快速进入功能 | ✅ |
| 3 | 扩展 Stage / Chapter / Word 类型，支持多模式 | ✅ |
| 4 | 实现 WordCard.tsx 词汇学习浮窗 | ✅ |
| 5 | 实现 DialogueStage.tsx（对话模式）+ JSON 数据 | ✅ |
| 6 | 实现 SceneStage.tsx（场景模式）+ JSON 数据 | ✅ |
| 7 | 拆分 CardStage.tsx（卡片模式保留） | ✅ |
| 8 | StagePage 改造为模式路由 + 顶部切换 UI | ✅ |
| 9 | 数据加载器 + 集成测试 | ✅ |

### 核心实现特性

- **推荐舞台**：首页自动推荐下一个要学的舞台，减少导航步骤
- **随机挑战**：一键随机开始，适合快速学习模式
- **对话学习**：单词点击即学，自然融合学练流程
- **场景探索**：插画热点互动学词汇，进度可视化
- **卡片模式**：保留高效答题设计（应试派可选）
- **模式灵活切换**：舞台内支持多模式切换

### 新增文件结构

```
src/
├── components/
│   └── WordCard.tsx ✨ 词汇学习浮窗
├── pages/stage/
│   ├── StagePage.tsx (重构：模式路由)
│   ├── DialogueStage.tsx ✨ 对话学习模式
│   ├── SceneStage.tsx ✨ 场景探索模式
│   └── CardStage.tsx (拆分：卡片模式)
├── data/
│   ├── loaders.ts ✨ 数据加载系统
│   ├── dialogues/
│   │   └── drama-ch1-st1.json ✨
│   └── scenes/
│       └── travel-ch1-st1.json ✨
└── types/index.ts (扩展：支持多模式、对话、场景)
```

### 下一步建议

**短期（立即可做）**：
1. 为每个轨道的其他舞台创建对话/场景数据（5 轨 × 5 舞 = 大量工作）
2. 补充真实插画（Storyset / unDraw）替换占位符
3. 创建真实音频文件或集成文字转语音库（TTS）

**中期（1-2 周）**：
1. 用户模式偏好保存（localStorage）→ 下次自动还原选择
2. 词汇学习统计面板（本周学了多少新词）
3. 积分系统优化（不同模式、难度的 XP 权重）

**长期（后续迭代）**：
1. 社交排行榜（与朋友比较学习进度）
2. 语音识别练习（Web Speech API 口语)
3. 国际化支持（i18n）

---

## ✅ Phase 10：UI/UX 优化（2026-04-27）

### 核心问题
用户反馈三个核心页面（首页、赛道、我的）存在的问题：
1. **首页信息过多，焦点不清**：推荐舞台 + 复习提醒 + 统计卡片 + 今日推荐 + 打卡日历，用户不知道先干什么
2. **赛道卡片太简陋**：仅显示名称、等级、XP，缺少描述、进度条、快捷操作
3. **我的页面不完整**：缺少用户信息展示、学习统计、打卡日历，功能菜单有重复

### 优化方案

#### 首页（HomePage.tsx）
**删除项**：
- ❌ "今日推荐"词汇流（用户不会直接学单词）
- ❌ "其他赛道"按钮组（可在赛道页面选）
- ❌ 打卡日历（移到"我的"页面）

**保留和增强**：
- ✅ 推荐舞台卡片（加大突出，2 列布局的快捷按钮下方）
- ✅ 复习提醒（红色高亮，重点提示）
- ✅ 欢迎语 + 快速数据条（顶部，简洁）
- ✅ 3 个操作按钮：随机挑战、选择赛道
- ✅ 连续打卡卡片（焦点突出）
- ✅ 3 个关键统计：本周学词、总完成关卡、打卡天数

**新结构**：
```
顶部欢迎语 + 快速数据
推荐舞台卡片（2 列布局）
├─ 🎲 随机挑战 | 📖 选择赛道
复习提醒（如果有）
连续打卡卡片
3 个关键统计数据
```

#### 赛道页面（TracksPage.tsx）
**赛道卡片重新设计**：
```
┌──────────────────────────────┐
│ 🎬 追剧党                      │
│ 美剧电影里的日常表达            │
├──────────────────────────────┤
│ 进度：■■■■■□□□□□ 50% (5/10) │
│ 等级：Lv2 | 经验：150 XP       │
├──────────────────────────────┤
│ [进入轨道] [继续学习]          │
└──────────────────────────────┘
```

**改动**：
1. ✅ 增加赛道描述显示
2. ✅ 加进度条：完成度百分比 + 完成关卡数
3. ✅ 两个按钮：进入轨道 + 继续学习（快捷）
4. ✅ 卡片颜色区分（travel/blue, drama/purple, exam/red）
5. ✅ 未选中赛道单独区域，灰显可点击添加

#### 我的页面（MePage.tsx）
**新增用户信息卡**：
```
┌──────────────────┐
│ 🦊 yunfan      │
│ Lv3 · 450 XP   │
│ 7 天打卡 · 32词 │
│ [编辑头像][编辑名] │
└──────────────────┘
```

**新增周统计卡**：
```
┌──────────────────┐
│ 本周学习统计     │
├──────────────────┤
│ 32词 | 8关      │
│ ★★   | 7天打卡 │
└──────────────────┘
```

**菜单简化**：
- ✅ 赛道选择（管理轨道）
- ✅ 学习设置（语速、目标、提醒）
- ✅ 成就墙（已有）
- ✅ 关于与反馈（新）
- ❌ 词包（移除，未实现）
- ✅ 打卡日历（从首页移过来）

### 完成工作

| 文件 | 任务 | 状态 |
|------|------|------|
| HomePage.tsx | 重构布局：删除今日推荐/日历，整理统计数据，强化推荐卡片 | ✅ |
| TracksPage.tsx | 增加赛道描述、进度条、"继续学习"按钮、卡片颜色 | ✅ |
| MePage.tsx | 新增用户信息卡、周统计卡、打卡日历、菜单简化 | ✅ |
| 文档清理 | 删除冗余 MD 文件（BUILD_PLAN/COMPLETION_STATUS/PHASE_9/PLAN/PLAN_V2/TEST_REPORT/VIBE_CODING） | ✅ |
| 编译验证 | npm run build 通过，应用运行于 localhost:5173 | ✅ |

### 设计原则
1. **信息层级清晰**：核心操作突出，辅助信息在下
2. **减少认知负荷**：删除无用信息，集中注意力
3. **一致的卡片设计**：所有卡片使用统一样式和交互
4. **快捷操作**：常用操作（继续学习、随机挑战）易达

### 下一步建议
1. **测试反馈**：用户体验测试，收集反馈（首页是否清爽、赛道卡片是否有用）
2. **底部导航**：隐藏听力/口语标签页（v1.0 只开放首页/赛道/复习/我的）
3. **数据补充**：为所有舞台补充对话/场景 JSON 数据和音频
4. **真实插画**：集成 Storyset/unDraw 插画替换占位符

---

## ✨ 增强：词汇卡片加入例句（2026-04-27）

### 问题
用户反馈学习卡片太简陋，仅显示单词、音标、词性、中文意思，缺少**例句**这一关键信息。例句能帮助用户理解单词的实际用法和语境。

### 解决方案
1. **Word 类型扩展**：添加 `examples?: Array<{ en: string; zh: string }>` 字段
2. **CardStage 增强**：在学习阶段显示 1-2 个例句（英文+中文翻译）
3. **数据补充**：drama.json 第一章的 10 个词汇已添加例句示例

### 实现细节

**类型定义**（src/types/index.ts）：
```typescript
export interface Word {
  // ... 现有字段
  examples?: Array<{ en: string; zh: string }> // 例句：英文和中文
  // ...
}
```

**CardStage 学习阶段（src/pages/stage/CardStage.tsx）**：
```
┌──────────────────────────────┐
│ buddy                         │
│ [ˈbʌdi]                      │
│ [听发音]                      │
├──────────────────────────────┤
│ 词性：n.                      │
│ 中文释义：伙伴                 │
│ 例句：                        │
│  "Hey buddy, how are you?"    │
│  "嘿，伙计，你好吗？"          │
└──────────────────────────────┘
```

**数据格式**（drama.json 示例）：
```json
{
  "word": "hey",
  "phonetic": "[heɪ]",
  "pos": "intj.",
  "meaning": "嘿（打招呼）",
  "examples": [
    {
      "en": "Hey! How are you doing?",
      "zh": "嘿！你在干吗呢？"
    },
    {
      "en": "Hey, did you watch that movie?",
      "zh": "嘿，你看那部电影了吗？"
    }
  ]
}
```

### 完成工作
| 文件 | 修改 | 状态 |
|------|------|------|
| types/index.ts | 扩展 Word 接口，添加 examples 字段 | ✅ |
| CardStage.tsx | 学习阶段显示例句（琥珀色卡片） | ✅ |
| seed.ts | 更新 WordData 接口和初始化逻辑 | ✅ |
| drama.json | 第一章 10 词添加例句示范 | ✅ |
| 编译验证 | npm run build 通过 | ✅ |

### 后续建议
- 为 travel.json 和 exam.json 的所有词汇补充例句
- 优化例句显示（可展开/收起，支持更多例句）
- 考虑添加词汇搭配（collocations）信息

---

**当前会话完成**：UI/UX 优化完毕，词汇卡片增强完成。三个核心页面已重新设计，例句信息已集成。应用在 localhost:5173 运行。

---

## ✅ Phase 11：学习闭环增强（2026-04-27）

### 三大核心改进

#### 1️⃣ 真人发音（Youdao CDN）
**问题**：浏览器 SpeechSynthesis 机器音重，发音不地道。

**方案**：
- `src/tts/tts.ts` 改造 `speak()` 函数：优先尝试有道词典 CDN 真人音频，失败自动回退 TTS
- URL 模式：`https://dict.youdao.com/dictvoice?audio={word}&type={1=美音|2=英音}`
- 全局唯一播放：新调用自动停止上一段
- ✅ 零成本、无需鉴权、覆盖常见词；短语/罕见词自动 fallback

**关键代码**：
```typescript
const audio = new Audio(getYoudaoAudioUrl(text, accent))
audio.addEventListener('error', () => fallbackTTS(text, options))
audio.play().catch(() => fallbackTTS(text, options))
```

#### 2️⃣ 错题本 + 掌握度系统
**问题**：用户答错只看一眼反馈就过了，缺少集中重学；word.mastery 字段从未更新。

**方案**：
- **新增 Dexie 表 `wrongAnswers`**（db.ts version=4）：
  - 字段：`wordId, stageId, questionPrompt, wrongOption, correctOption, wrongCount, lastWrongAt, resolved`
  - 同一题目重复答错只 upsert 计数，不重复录入
- **CardStage 双向反馈**：
  - 第一次答对：`mastery +1`
  - 第一次答错：`mastery -1`，写入错题本
  - 错后再答对：标记 `resolved: true`（不再扣 mastery）
- **新页面 `/wrong-answers`** (`src/pages/wrong-answers/WrongAnswersPage.tsx`)：
  - 统计未掌握 / 已修复数
  - 错题列表显示"你的错误答案 vs 正确答案"+ 听发音 + 跳回该舞台重练
  - 已修复区可一键清空
- **MePage 入口**：菜单第二项"错题本"，未掌握数显示红色徽章

#### 3️⃣ 句子重组（培养语感）
**问题**：当前只有选择题，缺少语序训练。

**方案**：
- CardStage 新增 phase：`intro → learning → quiz → reorder → summary`
- **数据来源**：复用 word.examples 字段，挑 ≤10 词的短句，最多 2 句
- **交互设计**：
  - 上方显示中文意思 + 听原句按钮
  - 中部"已选区"（虚线框）：点击词块可放回
  - 下部"候选区"：随机打乱的词块，点击进入"已选区"
  - 操作：[重置] [检查]
  - 检查正确 → 900ms 后自动下一句；错误 → 提示重排
- **优雅降级**：如果当前舞台所有词都没例句或只有长句，自动跳过该阶段

### 数据库迁移
db.ts 添加 version 4：
```typescript
this.version(4).stores({
  // ... 现有表
  words: 'id, *trackTags, difficulty, mastery', // mastery 加索引
  wrongAnswers: '++id, wordId, stageId, resolved, lastWrongAt',
})
```
Dexie 会自动迁移：现有数据保留，新表初始为空。

### 完成工作

| 文件 | 任务 | 状态 |
|------|------|------|
| `tts/tts.ts` | 有道 CDN 音频 + TTS 回退 | ✅ |
| `pages/stage/CardStage.tsx` | 用 speak() 替代直调 SpeechSynthesis | ✅ |
| `types/index.ts` | 新增 WrongAnswer 接口 | ✅ |
| `db/db.ts` | version 4 + wrongAnswers 表 | ✅ |
| `pages/stage/CardStage.tsx` | 错题录入 + mastery 增减逻辑 | ✅ |
| `pages/wrong-answers/WrongAnswersPage.tsx` | 错题本页面（新建） | ✅ |
| `router.tsx` | 注册 /wrong-answers 路由 | ✅ |
| `pages/me/MePage.tsx` | 添加错题本菜单 + 未掌握徽章 | ✅ |
| `pages/stage/CardStage.tsx` | 新增 reorder phase + tokenize/shuffle 工具 | ✅ |
| 编译验证 | npm run build 通过 | ✅ |

### 使用方式
1. 在卡片模式答错时 → 错题自动入库
2. 我的页面 → 点"错题本" → 查看待重学题目（显示红色徽章计数）
3. 点"回到该舞台重练" → 答对后该题标记为已修复
4. 学习阶段播放发音时听到的将是有道真人录音（首次访问需联网，后续可缓存）
5. 完成 quiz 后进入"句子重组"环节，培养语序和搭配语感

### 后续建议
- 听写模式（听音频拼写或选词）— 当前底部"听力"标签可激活
- 词根/词族联想（数据补充 + UI）
- 推送提醒（PWA notification API，已支持但未启用）

---

**当前会话完成**：学习闭环增强（真人发音 + 错题本 + 句子重组）实施完毕，npm run build 通过。

---

## ✅ Phase 12：听写模式 + 词根词族（2026-04-27）

### 1️⃣ 听写模式（ListeningPage 重构）
**问题**：原 ListeningPage 只有"听音选义"单一模式，缺少拼写训练。

**改进**：
- **双模式切换**：
  - 🎯 **听音选义**：听单词 → 4 选 1 选中文意思
  - ✍️ **听音拼写**：听单词 → 输入英文拼写（仅纯单词，≤12 字符）
- **智能词池优先级**（核心改进）：
  - 优先：错题本中未修复的词 ∪ mastery<3 的词
  - 回退：全部词汇（不足 4 个候选时）
  - **效果**：听力练习自动聚焦在用户的弱项词
- **拼写交互细节**：
  - Enter 键提交（再次 Enter 进入下一题）
  - 错误提示 + "再试一次"按钮（保留题目，重置输入）
  - 正确后显示音标作为额外学习线索
- **总分 / 正确率**实时显示在标题下方
- **语速控制**保留（0.75x / 1x / 1.25x）

**关键代码**：
```typescript
// 词池优先级：错题词 + 低掌握度词
const wordPool = useMemo(() => {
  const wrongWordIds = new Set(wrongAnswers?.map((w) => w.wordId) ?? [])
  const priority = allWords.filter(
    (w) => wrongWordIds.has(w.id) || w.mastery < 3
  )
  return priority.length >= 4 ? priority : allWords
}, [allWords, wrongAnswers])
```

### 2️⃣ 词根 / 词族（提升记忆效率）
**问题**：单词孤立学习效率低，缺少词形拓展。

**类型扩展**（types/index.ts）：
```typescript
export interface Word {
  // ... 现有字段
  roots?: string       // 词根分解，例：'ac-（朝向）+ quire（寻求）'
  family?: string[]    // 同族词数组，例：['acquisition', 'require', 'inquire']
}
```

**CardStage 学习阶段新增展示**：
```
┌──────────────────┐
│ 中文释义         │
│ 例句 (amber)     │
│ 📜 词根 (purple) │  ← 新增
│ 🌳 同族词 (indigo) │  ← 新增（标签云）
└──────────────────┘
```

**示范数据**：exam.json 第一章 10 个词全部添加：
- `examples`（英中例句）
- `roots`（词根分解）
- `family`（同族词列表）

例如：
```json
{
  "word": "acquire",
  "examples": [{"en": "He acquired English by watching movies.", "zh": "他通过看电影学会了英语。"}],
  "roots": "ac-（朝向）+ quire（寻求）→ 朝目标寻求",
  "family": ["acquisition", "require", "inquire", "request"]
}
```

### 完成工作

| 文件 | 任务 | 状态 |
|------|------|------|
| `pages/listening/ListeningPage.tsx` | 重写：双模式 + 智能词池 + 拼写交互 | ✅ |
| `types/index.ts` | Word 接口加 roots / family 字段 | ✅ |
| `db/seed.ts` | WordData 接口同步 + 初始化保留新字段 | ✅ |
| `pages/stage/CardStage.tsx` | 学习阶段展示词根（紫）+ 同族词标签（靛蓝） | ✅ |
| `data/tracks/exam.json` | 第一章 10 词补充 examples/roots/family | ✅ |
| 编译验证 | npm run build 通过 | ✅ |

### 重要使用提示
- **错题词回流到听力训练**：用户在 quiz 中答错的词会自动出现在听力练习中，形成完整的学习闭环
- **词根展示有边际成本**：drama/travel 词汇暂未补充，仅 exam 第一章作为示范；后续可批量补充
- **现有用户**测试需重置 IndexedDB（DevTools → Application → IndexedDB → 删除 EnglishQuestDB）

### 后续建议
- **批量补充 roots/family 到 drama/travel 数据**
- **听句填空**模式（基于 examples，挖空一个词）
- **学习路径推荐**：基于词族关系，学完 acquire 后推荐学 require/inquire
- **PWA 推送提醒**（已支持但未启用）

---

## ✅ Phase 13：趣味练习模式（2026-04-27）

### 背景
用户反馈：卡片式刷单词太枯燥，缺乏趣味性和挑战感。

### 新增三大练习模式

#### 1️⃣ 快速刷词（QuickQuizPage）
**路由**：`/quick-quiz/:trackId`

**特性**：
- **三种模式切换**：英→中、中→英、听音选义
- **只练已学单词**：`mastery >= 1` 的词才会出现
- **连击系统**：连续答对 3 次以上显示连击特效
- **自动下一题**：答对后 500ms 自动进入下一题
- **完成统计**：正确率、答对数、最高连击

**交互设计**：
```
┌─────────────────────────┐
│  [英→中] [中→英] [听音] │  ← 模式切换
├─────────────────────────┤
│       amazing           │  ← 题目
│      [əˈmeɪzɪŋ] 🔊     │
├─────────────────────────┤
│  ○ 令人惊叹的           │  ← 选项
│  ○ 糟糕的               │
│  ○ 奇怪的               │
│  ○ 搞笑的               │
└─────────────────────────┘
```

#### 2️⃣ 限时挑战（ChallengePage）
**路由**：`/challenge/:trackId`

**特性**：
- **60 秒倒计时**：时间紧迫感
- **计分系统**：基础 10 分 + 连击加成（最多 +20）
- **连击加分**：连续答对分数递增
- **2x2 选项布局**：加快选择速度
- **结束统计**：总分、答对数、最高连击、平均用时

**计分规则**：
```
基础分：10 分/题
连击加成：(连击数 - 1) × 2，最高 +20
例：连击 5 时，单题得分 = 10 + 8 = 18 分
```

#### 3️⃣ 对话练习（DialoguePracticePage）
**路由**：`/dialogue/:trackId`

**特性**：
- **场景对话**：模拟真实对话场景
- **填空选词**：在对话中选择正确单词
- **即时发音**：答对后自动朗读完整句子
- **对话回顾**：完成后展示完整对话记录
- **多套模板**：不同场景随机切换

**对话模板示例**（旅行赛道）：
```
场景：机场值机
A: Hi, I'd like to check in for my flight.
B: Sure! May I see your [___] please?  ← 选择 passport
A: Here you go. I have one [___] to check.  ← 选择 suitcase
B: Perfect. Here's your [___]. Gate 15.  ← 选择 boarding pass
```

### 核心设计原则

**先学后练**：
- 所有练习模式只使用 `mastery >= 1` 的已学单词
- 未学过单词时显示提示："先去学习更多单词吧"
- 干扰选项从全部词池中选（保证有足够选项）

**趣味性增强**：
- 连击动画特效（⚡ 图标 + 放大动画）
- 分数飘字效果（+10 向上飘出）
- 倒计时紧张感（最后 10 秒红色闪烁）
- 对话式学习的场景代入感

### 新增文件

```
src/pages/
├── quick-quiz/
│   └── QuickQuizPage.tsx ✨ 快速刷词
├── challenge/
│   └── ChallengePage.tsx ✨ 限时挑战
└── dialogue-practice/
    └── DialoguePracticePage.tsx ✨ 对话练习
```

### 路由更新

```typescript
// router.tsx 新增
{ path: 'quick-quiz/:trackId', element: <QuickQuizPage /> },
{ path: 'challenge/:trackId', element: <ChallengePage /> },
{ path: 'dialogue/:trackId', element: <DialoguePracticePage /> },
```

### 赛道页面入口

TracksPage 每个赛道卡片新增练习模式入口：
```
┌─────────────────────────────┐
│ 练习模式                     │
│ [⚡快速刷词] [⏱限时挑战] [💬对话练习] │
└─────────────────────────────┘
```

### 完成工作

| 文件 | 任务 | 状态 |
|------|------|------|
| `pages/quick-quiz/QuickQuizPage.tsx` | 快速刷词页面（三模式+连击） | ✅ |
| `pages/challenge/ChallengePage.tsx` | 限时挑战页面（60s+计分） | ✅ |
| `pages/dialogue-practice/DialoguePracticePage.tsx` | 对话练习页面（场景填空） | ✅ |
| `router.tsx` | 注册三个新路由 | ✅ |
| `pages/tracks/TracksPage.tsx` | 添加练习模式入口按钮 | ✅ |
| 词池逻辑 | 只使用已学单词（mastery >= 1） | ✅ |
| 空状态处理 | 未学单词时显示引导提示 | ✅ |

### 使用流程

1. **学习阶段**：通过关卡学习新单词（CardStage 学习阶段）
2. **巩固练习**：
   - 快速刷词：碎片时间快速复习
   - 限时挑战：测试反应速度和记忆
   - 对话练习：在场景中应用单词
3. **错题回流**：练习中答错的词进入错题本，后续重点复习

### 后续建议

- **排行榜**：限时挑战的历史最高分记录
- **每日挑战**：每日固定词汇的限时挑战
- **对话模板扩展**：更多场景、更长对话
- **语音输入**：对话练习支持语音回答

---

## 📋 Phase 14：L1-L6 等级系统（计划中）

### 背景
用户需求：词汇量太少（当前约 50 词/轨道），需要扩展到 5000 词/轨道，并支持等级选择。

### 目标规格

| 等级 | 关卡数 | 词汇量 | 难度定位 |
|------|--------|--------|----------|
| L1 | 40 | 400 | 入门基础 |
| L2 | 60 | 600 | 日常交流 |
| L3 | 80 | 800 | 场景扩展 |
| L4 | 100 | 1000 | 四级水平 |
| L5 | 100 | 1000 | 六级水平 |
| L6 | 120 | 1200 | 进阶表达 |
| **总计** | **500** | **5000** | - |

### 详细计划

**完整实施方案请参阅**：[`docs/LEVEL_SYSTEM_PLAN.md`](./docs/LEVEL_SYSTEM_PLAN.md)

### 核心改动预览

1. **类型扩展**：`Chapter.level` 从 1-5 扩展到 1-6
2. **数据结构**：每个轨道按等级拆分 JSON 文件（`L1.json` ~ `L6.json`）
3. **UI 新增**：等级选择器组件（TrackMapPage）
4. **进度系统**：按等级追踪学习进度
5. **解锁机制**：完成前一等级一定关卡数后解锁下一等级

### 实施阶段

| 阶段 | 内容 | 预计工时 | 里程碑 |
|------|------|----------|--------|
| Phase 1 | 基础架构 | 1-2 天 | 类型系统完成 |
| Phase 2 | L1-L2 数据 | 5-7 天 | 可学习 1000 词/轨道 |
| Phase 3 | seed.ts 重构 | 1-2 天 | 数据正确加载 |
| Phase 4 | UI 等级选择 | 2-3 天 | **MVP 发布** |
| Phase 5 | 进度系统 | 1-2 天 | 完整体验闭环 |
| Phase 6 | L3-L6 数据 | 30-40 天 | 完整 5000 词 |

**MVP 总计**：约 10-14 天 | **完整版总计**：约 40-55 天

### 状态
🔴 进行中（Travel L1 词库补全中）

---

## ✅ Phase 15：产品方向重构（2026-04-29）

### 核心决策

通过用户访谈，确认了以下产品方向，并完成代码实施：

| 决策 | 内容 |
|------|------|
| 名称 | "赛道" → "主题" |
| 应试派 | 从活跃主题移除；词汇融入旅行/追剧高等级关卡 |
| 主题数量 | 专注 1 个主题（单选），随时可切换，进度独立保存 |
| 主题页布局 | 从列表式多卡片 → 单主题英雄布局 |
| 连续打卡 | 在主题页突出显示（与进度条并排） |
| 练习模式 | 保留在主题页独立区块，带已学词数徽章 |
| Onboarding | 从多选 1-3 → 单选 1 个主题，过滤掉应试派 |

### 产品理念确认

- **目标用户**：有具体使用场景的学习者（出行、追剧、求职等）
- **学习模式**：语境驱动，先看例句场景再理解单词
- **竞品差异**：参考"不背单词"的语境方向，但全功能免费
- **下一步**：主动回忆按钮（词汇弹窗增加"记住了/还不熟"）

### 完成工作

| 文件 | 修改 |
|------|------|
| `components/BottomTabBar.tsx` | "赛道" → "主题" |
| `pages/onboarding/OnboardingPage.tsx` | 单主题选择 + 过滤应试派 |
| `pages/tracks/TracksPage.tsx` | 完全重构为单主题英雄布局 |
| `pages/review/ReviewPage.tsx` | 完成状态和空状态加入练习模式 |
| `pages/stage/StagePage.tsx` | "返回赛道页" → "返回主题页" |
| `pages/me/MePage.tsx` | "赛道选择" → "主题选择" |
| `pages/home/HomePage.tsx` | "选择赛道" → "选择主题" |
| `db/seed.ts` | 默认主题改为单选旅行、成就文案更新 |
| `docs/ROADMAP.md` | 全面更新，反映新产品方向 |
| `docs/DIFFICULTY_DESIGN.md` | 移除应试派，保留旅行/追剧 |
| `docs/LEVEL_SYSTEM_PLAN.md` | 更新为 2 主题架构 |

---

## ✅ Phase 16：混合题型 + 记忆辅助优化（2026-04-29）

### 核心改动

#### 1️⃣ 三种 Quiz 题型（随机混合）

`ScenarioStep` 新增字段：

```typescript
type?: 'meaning' | 'cloze' | 'context'
sentence?: string    // cloze/context 展示的例句
targetWord?: string  // context 类型用于 mastery 追踪的英文词（correctOption 是中文）
```

**题型说明**：

| 题型 | 展示 | 交互 | 触发条件 |
|------|------|------|----------|
| `meaning` | 中文释义 → 选英文词 | 4 选 1 | 始终可用 |
| `spell` | 中文释义 → 打字拼写 | 输入框 + Enter | 始终可用 |
| `cloze` | 例句挖空（`___`）→ 填入 | 4 选 1 | 词汇有例句时 |
| `context` | 例句高亮目标词 → 选中文义 | 4 选 1 | 词汇有例句时 |

`buildFallbackScenario` 为每个词随机选题型；无例句时退回 meaning 类型。

cloze 展示蓝色卡片，context 展示紫色卡片，题型标签显示在题号右侧。

#### 2️⃣ memoryAid 字段

- `Word` 接口新增 `memoryAid?: string`（记忆联想提示，来自 JSON 数据）
- `seed.ts` 同步读取该字段
- `buildMemoryHint` 优先级：`memoryAid > roots > rootHint > fallback`
- fallback 文案改为更具体的表述，不再是通用的"想象在场景中使用…的画面"

#### 3️⃣ 每关题目数

`buildFallbackScenario` 从最多 5 题改为最多 10 题（与每关词汇数一致）。

### 完成工作

| 文件 | 任务 |
|------|------|
| `types/index.ts` | Word 新增 `memoryAid` 字段 |
| `db/seed.ts` | 读取 JSON 中的 `memoryAid` |
| `data/stage-scenarios/index.ts` | ScenarioStep 新增 type/sentence/targetWord；buildFallbackScenario 支持三种题型；题目上限 5→10 |
| `pages/stage/CardStage.tsx` | buildMemoryHint 优先用 memoryAid；quiz 渲染适配三种题型；mastery/错题追踪兼容 context 类型 |

---

**当前会话完成**：产品方向重构 + 文档同步，Travel L1 词库补全为下一步优先任务。
