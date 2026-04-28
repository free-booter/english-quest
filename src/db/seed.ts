import { db } from './db'
import { LEVEL_CONFIG } from '../data/levels'

// Track metadata
import travelIndex from '../data/tracks/travel/index.json'
import dramaIndex from '../data/tracks/drama/index.json'
import examIndex from '../data/tracks/exam/index.json'

// Travel level data
import travelL1 from '../data/tracks/travel/L1.json'
import travelL2 from '../data/tracks/travel/L2.json'
import travelL3 from '../data/tracks/travel/L3.json'

// Drama level data
import dramaL1 from '../data/tracks/drama/L1.json'
import dramaL2 from '../data/tracks/drama/L2.json'
import dramaL3 from '../data/tracks/drama/L3.json'

// Exam level data
import examL1 from '../data/tracks/exam/L1.json'
import examL2 from '../data/tracks/exam/L2.json'
import examL3 from '../data/tracks/exam/L3.json'

import { Achievement, Chapter, Stage, Track, TrackProgress, UserSettings, Word } from '../types'

interface WordData {
  word: string
  phonetic: string
  pos: string
  meaning: string
  examples?: Array<{ en: string; zh: string }>
  definition?: string
  senses?: Word['senses']
  teachingExamples?: Word['teachingExamples']
  phrases?: Word['phrases']
  relatedWords?: Word['relatedWords']
  contentStatus?: Word['contentStatus']
  roots?: string
  family?: string[]
  rootHint?: string
}

interface StageSeed {
  id: string
  index: number
  title: string
  theme: string
  words: Array<string | WordData>
}

interface ChapterSeed {
  id: string
  level: 1 | 2 | 3 | 4 | 5 | 6
  index: number
  title: string
  scenario: string
  scenarioImage?: string
  stages: StageSeed[]
}

interface LevelData {
  level: number
  name: string
  chapters: ChapterSeed[]
}

interface TrackIndexData {
  id: string
  name: string
  icon: string
  description: string
  color: string
}

interface TrackBundle {
  index: TrackIndexData
  levels: LevelData[]
}

const TRACK_BUNDLES: TrackBundle[] = [
  {
    index: travelIndex as TrackIndexData,
    levels: [travelL1, travelL2, travelL3] as LevelData[],
  },
  {
    index: dramaIndex as TrackIndexData,
    levels: [dramaL1, dramaL2, dramaL3] as LevelData[],
  },
  {
    index: examIndex as TrackIndexData,
    levels: [examL1, examL2, examL3] as LevelData[],
  },
]

const MEANING_DICTIONARY: Record<string, string> = {
  'hey': '嘿；嗨（打招呼）',
  "what's up": '最近怎么样；咋样',
  "how's it going": '近况如何',
  'see you': '回头见',
  'take care': '保重；照顾好自己',
  'awesome': '太棒了',
  'terrible': '糟糕的',
  'amazing': '惊人的；太赞了',
  'weird': '奇怪的',
  'hilarious': '非常好笑的',
  'buddy': '朋友；哥们',
  'pal': '伙伴',
  'hang out': '出去玩；闲逛',
  'chill': '放松；冷静',
  'squad': '小团队；小圈子',
  'crush': '暗恋对象',
  'date': '约会',
  'breakup': '分手',
  'hook up': '暧昧/短期发展关系',
  'ex': '前任',
  'suitcase': '手提箱；行李箱',
  'passport': '护照',
  'ticket': '票；机票',
  'visa': '签证',
  'itinerary': '行程单',
  'terminal': '航站楼',
  'gate': '登机口',
  'boarding': '登机',
  'security': '安检',
  'reservation': '预订',
  'lobby': '大堂',
  'checkout': '退房；结账',
  'direction': '方向；指路',
  'souvenir': '纪念品',
  'bargain': '讨价还价；便宜货',
  'abandon': '放弃；抛弃',
  'accept': '接受',
  'achieve': '达成；实现',
  'acquire': '获得；习得',
  'adapt': '适应；调整',
  'analyze': '分析',
}

function normalizeMeaning(word: string, trackName: string): string {
  return MEANING_DICTIONARY[word.toLowerCase()] ?? `${word}（${trackName}高频词）`
}

function normalizePos(word: string): string {
  if (word.includes(' ')) return 'phrase'
  return 'n./v.'
}

function toDifficulty(level: number): 1 | 2 | 3 | 4 | 5 | 6 {
  const clamped = Math.max(1, Math.min(6, level))
  return clamped as 1 | 2 | 3 | 4 | 5 | 6
}

function buildInitialLevelProgress(
  levels: LevelData[]
): Record<number, { completed: number; total: number }> {
  const progress: Record<number, { completed: number; total: number }> = {}
  for (const levelData of levels) {
    const total = levelData.chapters.reduce((sum, ch) => sum + ch.stages.length, 0)
    progress[levelData.level] = { completed: 0, total }
  }
  // Fill in levels not yet in data with config values
  for (const [lvlKey, config] of Object.entries(LEVEL_CONFIG)) {
    const lvl = parseInt(lvlKey)
    if (!progress[lvl]) {
      progress[lvl] = { completed: 0, total: config.stageCount }
    }
  }
  return progress
}

export async function initializeDB() {
  const existingTracks = await db.tracks.count()
  if (existingTracks > 0) return

  await db.transaction(
    'rw',
    db.tables,
    async () => {
      await db.tracks.clear()
      await db.chapters.clear()
      await db.stages.clear()
      await db.words.clear()
      await db.trackProgress.clear()
      await db.userSettings.clear()
      await db.achievements.clear()
      await db.reviews.clear()
      await db.checkIns.clear()

      const tracks: Track[] = []
      const chapters: Chapter[] = []
      const stages: Stage[] = []
      const words: Word[] = []
      const trackProgress: TrackProgress[] = []

      for (const bundle of TRACK_BUNDLES) {
        const { index: trackIndex, levels } = bundle

        const allChapters = levels.flatMap((l) => l.chapters)
        const stageCount = allChapters.reduce((sum, ch) => sum + ch.stages.length, 0)
        const totalWords = allChapters.reduce(
          (sum, ch) => sum + ch.stages.reduce((s, st) => s + st.words.length, 0),
          0
        )

        tracks.push({
          ...trackIndex,
          totalWords,
          totalChapters: allChapters.length,
        })

        trackProgress.push({
          trackId: trackIndex.id,
          currentLevel: 1,
          totalXP: 0,
          completedChapters: [],
          startedAt: Date.now(),
          lastStudiedAt: Date.now(),
          unlockedLevels: [1],
          levelProgress: buildInitialLevelProgress(levels),
        })

        for (let chapterIdx = 0; chapterIdx < allChapters.length; chapterIdx += 1) {
          const chapterSeed = allChapters[chapterIdx]
          const chapterStageIds = chapterSeed.stages.map((stage) => stage.id)

          chapters.push({
            id: chapterSeed.id,
            trackId: trackIndex.id,
            level: chapterSeed.level,
            index: chapterSeed.index,
            title: chapterSeed.title,
            scenario: chapterSeed.scenario,
            scenarioImage: chapterSeed.scenarioImage,
            stageIds: chapterStageIds,
            status: chapterIdx === 0 ? 'inProgress' : 'locked',
          })

          for (const stageSeed of chapterSeed.stages) {
            const stageWordIds = stageSeed.words.map((_word, wordIdx) => `${stageSeed.id}-w${wordIdx + 1}`)
            const stageGlobalIndex = stages.length + 1

            let modes: ('card' | 'dialogue' | 'scene')[] = ['card']
            let defaultMode: 'card' | 'dialogue' | 'scene' = 'card'
            let dialogueId: string | undefined
            let sceneId: string | undefined

            if (trackIndex.id === 'drama') {
              modes = ['card', 'dialogue']
              defaultMode = 'card'
              dialogueId = stageSeed.id
            } else if (trackIndex.id === 'travel') {
              modes = ['card', 'scene']
              defaultMode = 'card'
              sceneId = stageSeed.id
            }

            stages.push({
              id: stageSeed.id,
              chapterId: chapterSeed.id,
              trackId: trackIndex.id,
              index: stageGlobalIndex,
              title: stageSeed.title,
              theme: stageSeed.theme,
              wordIds: stageWordIds,
              status: stageGlobalIndex % stageCount === 1 ? 'inProgress' : 'locked',
              stars: 0,
              modes,
              defaultMode,
              dialogueId,
              sceneId,
            })

            stageSeed.words.forEach((wordData, wordIdx) => {
              const isObject = typeof wordData === 'object'
              const wordText = isObject ? wordData.word : wordData
              const wordObj = isObject
                ? {
                    word: wordData.word,
                    phonetic: wordData.phonetic,
                    pos: wordData.pos,
                    meaning: wordData.meaning,
                    examples: wordData.examples,
                    definition: wordData.definition,
                    senses: wordData.senses,
                    teachingExamples: wordData.teachingExamples,
                    phrases: wordData.phrases,
                    relatedWords: wordData.relatedWords,
                    contentStatus: wordData.contentStatus,
                    roots: wordData.roots,
                    family: wordData.family,
                    rootHint: wordData.rootHint,
                  }
                : {
                    word: wordText,
                    phonetic: '',
                    pos: normalizePos(wordText),
                    meaning: normalizeMeaning(wordText, trackIndex.name),
                  }

              words.push({
                id: `${stageSeed.id}-w${wordIdx + 1}`,
                ...wordObj,
                trackTags: [trackIndex.id],
                difficulty: toDifficulty(chapterSeed.level),
                mastery: 0,
              })
            })
          }
        }
      }

      const defaultSettings: UserSettings = {
        selectedTracks: ['travel', 'drama'],
        primaryTrack: 'travel',
        avatar: 'fox',
        nickname: '冒险者',
        totalXP: 0,
        totalLevel: 1,
        dailyGoal: 3,
        ttsRate: 1,
        theme: 'auto',
        onboardingDone: false,
        createdAt: Date.now(),
      }

      const achievements: Achievement[] = [
        { id: 'first-stage', name: '初次通关', description: '完成第一个关卡', icon: '🥇', progress: 0 },
        { id: 'week-checkin', name: '七天打卡', description: '连续打卡 7 天', icon: '🔥', progress: 0 },
        { id: 'track-lv3', name: '赛道达人', description: '任意赛道达到 Lv3', icon: '🏅', progress: 0 },
      ]

      await db.tracks.bulkAdd(tracks)
      await db.chapters.bulkAdd(chapters)
      await db.stages.bulkAdd(stages)
      await db.words.bulkAdd(words)
      await db.trackProgress.bulkAdd(trackProgress)
      await db.userSettings.add(defaultSettings)
      await db.achievements.bulkAdd(achievements)
    }
  )
}
