import Dexie, { type Table } from 'dexie'
import {
  Word,
  Track,
  Chapter,
  Stage,
  DailyCheckIn,
  ReviewItem,
  TrackProgress,
  UserSettings,
  Achievement,
  WrongAnswer,
} from '../types'

export class EnglishQuestDB extends Dexie {
  words!: Table<Word>
  tracks!: Table<Track>
  chapters!: Table<Chapter>
  stages!: Table<Stage>
  checkIns!: Table<DailyCheckIn>
  reviews!: Table<ReviewItem>
  trackProgress!: Table<TrackProgress>
  userSettings!: Table<UserSettings, number>
  achievements!: Table<Achievement>
  wrongAnswers!: Table<WrongAnswer, number>

  constructor() {
    super('EnglishQuestDB')
    this.version(2).stores({
      tracks: 'id',
      chapters: 'id, trackId, level',
      stages: 'id, chapterId, trackId',
      words: 'id, packId',
      reviews: 'wordId, nextReviewDate',
      checkIns: 'date',
      trackProgress: 'trackId',
      userSettings: '++id',
      achievements: 'id, trackId',
    })

    this.version(3).stores({
      tracks: 'id',
      chapters: 'id, trackId, level',
      stages: 'id, chapterId, trackId',
      words: 'id, *trackTags, difficulty',
      reviews: 'wordId, nextReviewDate',
      checkIns: 'date',
      trackProgress: 'trackId',
      userSettings: '++id',
      achievements: 'id, trackId',
    })

    this.version(4).stores({
      tracks: 'id',
      chapters: 'id, trackId, level',
      stages: 'id, chapterId, trackId',
      words: 'id, *trackTags, difficulty, mastery',
      reviews: 'wordId, nextReviewDate',
      checkIns: 'date',
      trackProgress: 'trackId',
      userSettings: '++id',
      achievements: 'id, trackId',
      wrongAnswers: '++id, wordId, stageId, resolved, lastWrongAt',
    })

    this.version(5).stores({
      tracks: 'id',
      chapters: 'id, trackId, level',
      stages: 'id, chapterId, trackId',
      words: 'id, *trackTags, difficulty, mastery',
      reviews: 'wordId, nextReviewDate',
      checkIns: 'date',
      trackProgress: 'trackId',
      userSettings: '++id',
      achievements: 'id, trackId',
      wrongAnswers: '++id, wordId, stageId, resolved, lastWrongAt',
    }).upgrade(async (tx) => {
      await tx.table('trackProgress').toCollection().modify((progress) => {
        if (!progress.unlockedLevels) {
          progress.unlockedLevels = [1]
        }
        if (!progress.levelProgress) {
          progress.levelProgress = {
            1: { completed: 0, total: 40 },
            2: { completed: 0, total: 60 },
            3: { completed: 0, total: 80 },
            4: { completed: 0, total: 100 },
            5: { completed: 0, total: 100 },
            6: { completed: 0, total: 120 },
          }
        }
      })
    })
  }
}

export const db = new EnglishQuestDB()
