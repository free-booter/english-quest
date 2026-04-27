import { db } from './db'
import travelData from '../data/tracks/travel.json'
import dramaData from '../data/tracks/drama.json'
import examData from '../data/tracks/exam.json'
import { Achievement, Chapter, Stage, Track, TrackProgress, UserSettings, Word } from '../types'

interface WordData {
  word: string
  phonetic: string
  pos: string
  meaning: string
  examples?: Array<{ en: string; zh: string }>
  roots?: string
  family?: string[]
}

interface TrackSeed {
  track: Pick<Track, 'id' | 'name' | 'icon' | 'description' | 'color'>
  chapters: Array<{
    id: string
    level: 1 | 2 | 3 | 4 | 5
    index: number
    title: string
    scenario: string
    scenarioImage?: string
    stages: Array<{
      id: string
      index: number
      title: string
      theme: string
      words: Array<string | WordData>
    }>
  }>
}

const TRACK_SEEDS: TrackSeed[] = [travelData as TrackSeed, dramaData as TrackSeed, examData as TrackSeed]

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

function toDifficulty(level: 1 | 2 | 3 | 4 | 5): 1 | 2 | 3 | 4 | 5 {
  return level
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

      for (const trackSeed of TRACK_SEEDS) {
        const stageCount = trackSeed.chapters.reduce((sum, chapter) => sum + chapter.stages.length, 0)
        const totalWords = trackSeed.chapters.reduce(
          (sum, chapter) => sum + chapter.stages.reduce((stageSum, stage) => stageSum + stage.words.length, 0),
          0
        )

        tracks.push({
          ...trackSeed.track,
          totalWords,
          totalChapters: trackSeed.chapters.length,
        })

        trackProgress.push({
          trackId: trackSeed.track.id,
          currentLevel: 1,
          totalXP: 0,
          completedChapters: [],
          startedAt: Date.now(),
          lastStudiedAt: Date.now(),
        })

        for (let chapterIdx = 0; chapterIdx < trackSeed.chapters.length; chapterIdx += 1) {
          const chapterSeed = trackSeed.chapters[chapterIdx]
          const chapterStageIds = chapterSeed.stages.map((stage) => stage.id)

          chapters.push({
            id: chapterSeed.id,
            trackId: trackSeed.track.id,
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

            // 根据轨道分配学习模式
            let modes: ('card' | 'dialogue' | 'scene')[] = ['card']
            let defaultMode: 'card' | 'dialogue' | 'scene' = 'card'
            let dialogueId: string | undefined
            let sceneId: string | undefined

            if (trackSeed.track.id === 'drama') {
              modes = ['card', 'dialogue']
              defaultMode = 'card'
              dialogueId = stageSeed.id
            } else if (trackSeed.track.id === 'travel') {
              modes = ['card', 'scene']
              defaultMode = 'card'
              sceneId = stageSeed.id
            }

            stages.push({
              id: stageSeed.id,
              chapterId: chapterSeed.id,
              trackId: trackSeed.track.id,
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
                    roots: wordData.roots,
                    family: wordData.family,
                  }
                : {
                    word: wordText,
                    phonetic: '',
                    pos: normalizePos(wordText),
                    meaning: normalizeMeaning(wordText, trackSeed.track.name),
                  }

              words.push({
                id: `${stageSeed.id}-w${wordIdx + 1}`,
                ...wordObj,
                trackTags: [trackSeed.track.id],
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
