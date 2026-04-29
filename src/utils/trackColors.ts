export interface TrackColors {
  bg: string
  bgLight: string
  text: string
  hex: string
  shadow: string
  progress: string
}

export const getTrackColors = (_trackId?: string): TrackColors => ({
  bg: 'bg-brand-500',
  bgLight: 'bg-brand-50',
  text: 'text-brand-600',
  hex: '#0EA5E9',
  shadow: 'rgba(14,165,233,0.35)',
  progress: 'bg-brand-500',
})
