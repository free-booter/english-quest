interface RecognitionOptions {
  language?: string
  continuous?: boolean
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

export function isSupported(): boolean {
  return Boolean(SpeechRecognition)
}

export async function recognize(options: RecognitionOptions = {}): Promise<string> {
  if (!isSupported()) {
    throw new Error('Speech Recognition not supported in this browser')
  }

  const { language = 'en-US', continuous = false } = options

  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognition()
    recognition.lang = language
    recognition.continuous = continuous
    recognition.interimResults = true

    let finalTranscript = ''

    recognition.onstart = () => {
      console.log('Speech recognition started')
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      reject(new Error(`Speech recognition error: ${event.error}`))
    }

    recognition.onend = () => {
      console.log('Speech recognition ended')
      resolve(finalTranscript.trim())
    }

    recognition.start()
  })
}

// Simple Levenshtein distance for text similarity
function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0))

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i
  }

  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      )
    }
  }

  return track[str2.length][str1.length]
}

export function scoreSpeaking(spoken: string, target: string): number {
  const spokenLower = spoken.toLowerCase().trim()
  const targetLower = target.toLowerCase().trim()

  if (spokenLower === targetLower) return 100

  // Calculate similarity based on Levenshtein distance
  const distance = levenshteinDistance(spokenLower, targetLower)
  const maxLen = Math.max(spokenLower.length, targetLower.length)
  const similarity = Math.max(0, (1 - distance / maxLen) * 100)

  // Bonus for keyword matches
  const spokenWords = spokenLower.split(/\s+/)
  const targetWords = targetLower.split(/\s+/)
  const matchedWords = spokenWords.filter(w => targetWords.includes(w)).length
  const keywordBonus = (matchedWords / targetWords.length) * 20

  return Math.min(100, similarity + keywordBonus)
}

export function gradeScore(score: number): '💩' | '👌' | '🌟' {
  if (score >= 80) return '🌟'
  if (score >= 50) return '👌'
  return '💩'
}
