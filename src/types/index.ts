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
  level: 1 | 2 | 3 | 4 | 5
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
  roots?: string // 词根分解提示，例：'ac-（朝向）+ quire（寻求）'
  family?: string[] // 同族词，例：['acquisition', 'require', 'inquire']
  rootHint?: string
  trackTags: string[]
  difficulty: 1 | 2 | 3 | 4 | 5
  mastery: 0 | 1 | 2 | 3 | 4 | 5
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
  currentLevel: 1 | 2 | 3 | 4 | 5
  totalXP: number
  completedChapters: string[]
  startedAt: number
  lastStudiedAt: number
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
