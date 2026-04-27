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
  }
}

export const db = new EnglishQuestDB()
