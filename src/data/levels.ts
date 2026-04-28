import type { LevelMeta } from '../types'

export const LEVEL_CONFIG: Record<number, LevelMeta> = {
  1: {
    level: 1,
    name: '入门',
    stageCount: 40,
    wordCount: 400,
    unlockCondition: '注册即解锁',
    color: '#22c55e',
  },
  2: {
    level: 2,
    name: '初级',
    stageCount: 60,
    wordCount: 600,
    unlockCondition: '完成 L1 30 关',
    color: '#3b82f6',
  },
  3: {
    level: 3,
    name: '中级',
    stageCount: 80,
    wordCount: 800,
    unlockCondition: '完成 L2 45 关',
    color: '#8b5cf6',
  },
  4: {
    level: 4,
    name: '进阶',
    stageCount: 100,
    wordCount: 1000,
    unlockCondition: '完成 L3 60 关',
    color: '#f59e0b',
  },
  5: {
    level: 5,
    name: '高级',
    stageCount: 100,
    wordCount: 1000,
    unlockCondition: '完成 L4 75 关',
    color: '#ef4444',
  },
  6: {
    level: 6,
    name: '大师',
    stageCount: 120,
    wordCount: 1200,
    unlockCondition: '完成 L5 75 关',
    color: '#ec4899',
  },
}

// 解锁下一等级所需完成的关卡比例
export const UNLOCK_THRESHOLD = 0.75

export function isLevelUnlocked(
  levelNum: number,
  unlockedLevels: number[]
): boolean {
  return unlockedLevels.includes(levelNum)
}

export function getUnlockProgress(
  levelNum: number,
  levelProgress: Record<number, { completed: number; total: number }>
): { completed: number; total: number; percent: number; stagesNeeded: number } {
  const progress = levelProgress[levelNum] ?? { completed: 0, total: 0 }
  const config = LEVEL_CONFIG[levelNum]
  const threshold = config ? Math.ceil(config.stageCount * UNLOCK_THRESHOLD) : 0
  const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0
  const stagesNeeded = Math.max(0, threshold - progress.completed)
  return { ...progress, percent, stagesNeeded }
}
