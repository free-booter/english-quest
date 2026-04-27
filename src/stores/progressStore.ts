import { create } from 'zustand'

interface ProgressState {
  totalWordsLearned: number
  streakDays: number
  currentStageId: string | null
  setTotalWordsLearned: (count: number) => void
  setStreakDays: (days: number) => void
  setCurrentStageId: (id: string | null) => void
}

export const useProgressStore = create<ProgressState>((set) => ({
  totalWordsLearned: 0,
  streakDays: 0,
  currentStageId: null,
  setTotalWordsLearned: (count) => set({ totalWordsLearned: count }),
  setStreakDays: (days) => set({ streakDays: days }),
  setCurrentStageId: (id) => set({ currentStageId: id }),
}))
