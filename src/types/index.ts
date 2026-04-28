export interface Track {
  id: string
  name: string
  icon: string
  description: string
  color: string
  coverImage?: string
  totalWords: number
  totalChapters: number
}

export interface Chapter {
  id: string
  trackId: string
  level: 1 | 2 | 3 | 4 | 5 | 6
  index: number
  title: string
  scenario: string
  scenarioImage?: string
  stageIds: string[]
  status: 'locked' | 'inProgress' | 'completed'
  illustration?: string
}

export interface Stage {
  id: string
  chapterId: string
  trackId: string
  index: number
  title: string
  theme: string
  wordIds: string[]
  status: 'locked' | 'inProgress' | 'completed'
  stars: 0 | 1 | 2 | 3
  completedAt?: number
  modes: ('card' | 'dialogue' | 'scene')[]
  defaultMode: 'card' | 'dialogue' | 'scene'
  dialogueId?: string
  sceneId?: string
}

export interface Word {
  id: string
  word: string
  phonetic?: string
  pos: string
  meaning: string
  examples?: Array<{ en: string; zh: string }> // 例句：英文和中文
  definition?: string // 英文释义，用于辅助理解，不直接等同于教学例句
  senses?: WordSense[] // 按中文义项拆分的教学内容
  teachingExamples?: WordExample[] // 兼容全词级教学例句展示
  phrases?: WordPhrase[] // 常见词组、搭配或场景表达
  relatedWords?: RelatedWord[] // 同族词、近义词、反义词、易混词等
  contentStatus?: 'raw' | 'generated' | 'reviewed'
  roots?: string // 词根分解提示，例：'ac-（朝向）+ quire（寻求）'
  family?: string[] // 同族词，例：['acquisition', 'require', 'inquire']
  rootHint?: string
  trackTags: string[]
  difficulty: 1 | 2 | 3 | 4 | 5 | 6
  mastery: 0 | 1 | 2 | 3 | 4 | 5
}

export interface WordExample {
  en: string
  zh: string
  source: 'manual' | 'generated' | 'dictionary'
  checked: boolean
  note?: string
}

export interface WordSense {
  meaning: string
  important: boolean
  example: WordExample
}

export interface WordPhrase {
  phrase: string
  meaning: string
  example?: { en: string; zh: string }
}

export interface RelatedWord {
  word: string
  type: 'synonym' | 'antonym' | 'family' | 'confusable' | 'collocation'
  meaning?: string
}

export interface DailyCheckIn {
  date: string
  stageIds: string[]
  wordsLearned: number
  minutesSpent: number
}

export interface ReviewItem {
  wordId: string
  nextReviewDate: string
  intervalDay: 1 | 2 | 4 | 7 | 15 | 30
  failCount: number
}

export interface WrongAnswer {
  id?: number
  wordId: string
  stageId: string
  questionPrompt: string
  wrongOption: string
  correctOption: string
  wrongCount: number
  lastWrongAt: number
  resolved: boolean // 是否已修复（连续答对 2 次）
}

export interface TrackProgress {
  trackId: string
  currentLevel: 1 | 2 | 3 | 4 | 5 | 6
  totalXP: number
  completedChapters: string[]
  startedAt: number
  lastStudiedAt: number
  unlockedLevels: number[]
  levelProgress: Record<number, { completed: number; total: number }>
}

export interface LevelMeta {
  level: 1 | 2 | 3 | 4 | 5 | 6
  name: string
  stageCount: number
  wordCount: number
  unlockCondition: string
  color: string
}

export interface UserSettings {
  id?: number
  selectedTracks: string[]
  primaryTrack: string
  avatar: 'fox' | 'cat' | 'bear' | 'penguin' | 'owl' | 'tiger'
  nickname: string
  totalXP: number
  totalLevel: number
  dailyGoal: number
  ttsRate: number
  theme: 'light' | 'dark' | 'auto'
  onboardingDone: boolean
  createdAt: number
}

export interface Achievement {
  id: string
  trackId?: string
  name: string
  description: string
  icon: string
  unlockedAt?: number
  progress: number
}

// 兼容旧代码中的命名，后续可逐步移除。
export type Settings = UserSettings

// 对话和场景数据结构
export interface DialogueLine {
  id: string
  speaker: string
  text: string
  audio: string
  wordsInLine: string[]
}

export interface Dialogue {
  id: string
  stageId: string
  intro: string
  lines: DialogueLine[]
  questions: ComprehensionQuestion[]
}

export interface Hotspot {
  id: string
  x: number
  y: number
  radius: number
  wordId: string
  hint: string
}

export interface Scene {
  id: string
  stageId: string
  illustration: string
  intro: string
  hotspots: Hotspot[]
  questions: ComprehensionQuestion[]
}

export interface ComprehensionQuestion {
  id: string
  prompt: string
  relatedItems: string[]
  options: string[]
  correctOption: string
}
