import { DailyCheckIn } from '../types'

export function calcConsecutiveCheckInDays(checkIns: DailyCheckIn[]): number {
  if (!checkIns.length) return 0
  const checkInDates = new Set(checkIns.map((item) => item.date))
  const cursor = new Date()
  let streak = 0

  while (true) {
    const dateStr = cursor.toISOString().split('T')[0]
    if (!checkInDates.has(dateStr)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function aggregateWeeklyStats(checkIns: DailyCheckIn[]): { words: number; stages: number } {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekly = checkIns.filter((item) => item.date >= weekStartStr)
  const uniqueStages = new Set<string>()
  let words = 0

  for (const day of weekly) {
    words += day.wordsLearned
    day.stageIds.forEach((stageId) => uniqueStages.add(stageId))
  }

  return { words, stages: uniqueStages.size }
}
