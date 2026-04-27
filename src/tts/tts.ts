interface SpeakOptions {
  rate?: number
  pitch?: number
  volume?: number
  accent?: 'us' | 'uk'
}

let currentAudio: HTMLAudioElement | null = null

function getYoudaoAudioUrl(text: string, accent: 'us' | 'uk' = 'us'): string {
  const type = accent === 'us' ? 1 : 2
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=${type}`
}

function fallbackTTS(text: string, options: SpeakOptions) {
  const { rate = 1, pitch = 1, volume = 1 } = options
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = rate
  utterance.pitch = pitch
  utterance.volume = volume
  utterance.lang = 'en-US'
  window.speechSynthesis.speak(utterance)
}

export function speak(text: string, options: SpeakOptions = {}) {
  const { rate = 1, volume = 1, accent = 'us' } = options

  stop()

  const audio = new Audio(getYoudaoAudioUrl(text, accent))
  audio.volume = volume
  audio.playbackRate = rate
  currentAudio = audio

  audio.addEventListener('error', () => {
    fallbackTTS(text, options)
  })

  audio.play().catch(() => {
    fallbackTTS(text, options)
  })
}

export function stop() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  window.speechSynthesis.cancel()
}

export function isSupported(): boolean {
  return 'speechSynthesis' in window || typeof Audio !== 'undefined'
}
