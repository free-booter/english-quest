import { db } from '../db/db'

const XP_PER_STAGE = 20

function calcLevelFromXP(xp: number): number {
  return Math.max(1, Math.floor(xp / 200) + 1)
}

export async function completeStageWithProgress(stageId: string, stars: 0 | 1 | 2 | 3) {
  const stage = await db.stages.get(stageId)
  if (!stage) return

  const stageWords = await db.words.where('id').anyOf(stage.wordIds).toArray()

  await db.transaction(
    'rw',
    db.tables,
    async () => {
      await db.stages.update(stage.id, {
        status: 'completed',
        stars,
        completedAt: Date.now(),
      })

      const chapterStages = await db.stages
        .where('chapterId')
        .equals(stage.chapterId)
        .sortBy('index')
      const nextStage = chapterStages.find((item) => item.status === 'locked')
      if (nextStage) {
        await db.stages.update(nextStage.id, { status: 'inProgress' })
      }

      const isChapterCompleted = chapterStages.every((item) =>
        item.id === stage.id ? true : item.status === 'completed'
      )
      if (isChapterCompleted) {
        await db.chapters.update(stage.chapterId, { status: 'completed' })
        const trackChapters = await db.chapters.where('trackId').equals(stage.trackId).sortBy('index')
        const currentChapterIndex = trackChapters.findIndex((item) => item.id === stage.chapterId)
        if (currentChapterIndex >= 0 && currentChapterIndex < trackChapters.length - 1) {
          const nextChapter = trackChapters[currentChapterIndex + 1]
          if (nextChapter.status === 'locked') {
            await db.chapters.update(nextChapter.id, { status: 'inProgress' })
          }
        }
      }

      const progress = await db.trackProgress.where('trackId').equals(stage.trackId).first()
      if (progress) {
        const nextTrackXP = progress.totalXP + XP_PER_STAGE
        const completedChapters = isChapterCompleted
          ? Array.from(new Set([...progress.completedChapters, stage.chapterId]))
          : progress.completedChapters
        await db.trackProgress.update(stage.trackId, {
          totalXP: nextTrackXP,
          currentLevel: Math.min(5, calcLevelFromXP(nextTrackXP)) as 1 | 2 | 3 | 4 | 5,
          completedChapters,
          lastStudiedAt: Date.now(),
        })
      }

      const settings = await db.userSettings.toCollection().first()
      if (settings?.id) {
        const nextTotalXP = settings.totalXP + XP_PER_STAGE
        await db.userSettings.update(settings.id, {
          totalXP: nextTotalXP,
          totalLevel: calcLevelFromXP(nextTotalXP),
        })
      }

      const today = new Date().toISOString().split('T')[0]
      const existingCheckIn = await db.checkIns.where('date').equals(today).first()
      if (existingCheckIn) {
        const stageSet = new Set(existingCheckIn.stageIds)
        const isNewStageToday = !stageSet.has(stage.id)
        stageSet.add(stage.id)
        await db.checkIns.update(today, {
          stageIds: Array.from(stageSet),
          wordsLearned: isNewStageToday ? existingCheckIn.wordsLearned + stageWords.length : existingCheckIn.wordsLearned,
        })
      } else {
        await db.checkIns.add({
          date: today,
          stageIds: [stage.id],
          wordsLearned: stageWords.length,
          minutesSpent: 5,
        })
      }

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      for (const word of stageWords) {
        const existingReview = await db.reviews.where('wordId').equals(word.id).first()
        if (!existingReview) {
          await db.reviews.add({
            wordId: word.id,
            nextReviewDate: tomorrowStr,
            intervalDay: 1,
            failCount: 0,
          })
        }
      }
    }
  )
}
