import { create } from 'zustand'
import { Settings } from '../types'

interface UserState {
  settings: Settings | null
  setSettings: (settings: Settings) => void
}

export const useUserStore = create<UserState>((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings }),
}))
