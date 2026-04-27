import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic2, Volume2, Loader } from 'lucide-react'
import { db } from '../../db/db'
import { speak } from '../../tts/tts'
import { recognize, scoreSpeaking, gradeScore, isSupported } from '../../speech/recognizer'
import { Word } from '../../types'

interface SpeakingQuestion {
  word: Word
  sentence: string
}

const sampleSentences: Record<string, string[]> = {
  abandon: [
    'They abandoned the project.',
    'Do not abandon hope.',
  ],
  ability: [
    'She has the ability to speak five languages.',
    'His ability is remarkable.',
  ],
  accept: [
    'I accept your invitation.',
    'The company accepted our proposal.',
  ],
}

export default function SpeakingPage() {
  const words = useLiveQuery(() => db.words.toArray())
  const [currentQuestion, setCurrentQuestion] = useState<SpeakingQuestion | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [spokenText, setSpokenText] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [grade, setGrade] = useState<'💩' | '👌' | '🌟' | null>(null)
  const [questionsCompleted, setQuestionsCompleted] = useState(0)

  useEffect(() => {
    if (words && words.length > 0) {
      const word = words[Math.floor(Math.random() * words.length)]
      const sentence =
        sampleSentences[word.word.toLowerCase()]?.[
          Math.floor(Math.random() * sampleSentences[word.word.toLowerCase()].length)
        ] || `Use the word "${word.word}" in a sentence.`

      setCurrentQuestion({ word, sentence })
      setSpokenText('')
      setScore(null)
      setGrade(null)
    }
  }, [words])

  const handleStartListening = async () => {
    if (!isSupported()) {
      alert('Speech Recognition not supported in this browser')
      return
    }

    setIsListening(true)
    setSpokenText('')

    try {
      const text = await recognize({ language: 'en-US' })
      setSpokenText(text)

      if (currentQuestion && text.length > 0) {
        const calculateScore = scoreSpeaking(text, currentQuestion.sentence)
        setScore(Math.round(calculateScore))
        setGrade(gradeScore(calculateScore))
        setQuestionsCompleted(questionsCompleted + 1)
      }
    } catch (error) {
      console.error('Speech recognition error:', error)
      setSpokenText('无法识别，请重试')
    } finally {
      setIsListening(false)
    }
  }

  const handleNext = () => {
    if (!words) return
    const word = words[Math.floor(Math.random() * words.length)]
    const sentence =
      sampleSentences[word.word.toLowerCase()]?.[
        Math.floor(Math.random() * sampleSentences[word.word.toLowerCase()].length)
      ] || `Use the word "${word.word}" in a sentence.`

    setCurrentQuestion({ word, sentence })
    setSpokenText('')
    setScore(null)
    setGrade(null)
  }

  const handlePlaySentence = () => {
    if (currentQuestion) {
      speak(currentQuestion.sentence, { rate: 0.9 })
    }
  }

  if (!words || words.length === 0 || !currentQuestion || !isSupported()) {
    return (
      <div className="page">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-brand-700" style={{ fontFamily: 'Poppins' }}>
            口语跟读
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {!isSupported() ? '浏览器不支持语音识别' : '勇敢说出来'}
          </p>
        </div>

        <div className="card-accent text-center py-16 flex flex-col items-center justify-center">
          <Mic2 size={56} className="text-gold-400 mb-4 opacity-50" />
          <p className="text-gray-600 text-lg font-semibold">
            {!isSupported() ? '语音功能不可用' : '还没有学习的词语'}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {!isSupported() ? '请使用 Chrome、Safari 或 Edge 浏览器' : '先去闯关学习新词吧 📚'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page pb-32">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-brand-700" style={{ fontFamily: 'Poppins' }}>
          口语跟读
        </h1>
        <p className="text-sm text-gray-400 mt-1">{questionsCompleted} 个句子已完成</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.word.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          {/* Target Sentence */}
          <div className="card mb-6">
            <div className="flex items-start gap-3">
              <button
                onClick={handlePlaySentence}
                className="p-2 hover:bg-brand-100 rounded-full flex-shrink-0 transition mt-1"
              >
                <Volume2 size={20} className="text-brand-500" />
              </button>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">跟读这个句子：</p>
                <p className="text-lg text-gray-700 font-semibold">{currentQuestion.sentence}</p>
              </div>
            </div>
          </div>

          {/* Record Button */}
          <div className="flex justify-center mb-8">
            <motion.button
              onClick={handleStartListening}
              disabled={isListening}
              whileHover={!isListening ? { scale: 1.05 } : {}}
              whileTap={!isListening ? { scale: 0.95 } : {}}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-semibold transition shadow-lg hover:shadow-xl ${
                isListening
                  ? 'bg-red-500 cursor-not-allowed'
                  : 'bg-gradient-to-br from-gold-400 to-gold-600'
              }`}
            >
              {isListening ? (
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                  <Loader size={32} className="animate-spin" />
                </motion.div>
              ) : (
                <Mic2 size={32} />
              )}
            </motion.button>
          </div>

          {/* Transcription */}
          {spokenText && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <div className="card bg-indigo-50">
                <p className="text-xs text-gray-500 mb-1">你说的是：</p>
                <p className="text-gray-700">{spokenText}</p>
              </div>
            </motion.div>
          )}

          {/* Score */}
          {score !== null && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-6">
              <div className="card bg-gradient-to-r from-gold-50 to-amber-50 text-center">
                <div className="text-6xl font-bold mb-2">{grade}</div>
                <p className="text-2xl font-bold text-gray-700 mb-1">{score}分</p>
                <p className="text-sm text-gray-600">
                  {score >= 80
                    ? '太棒了！你的发音很接近 🎉'
                    : score >= 50
                    ? '不错！继续努力 💪'
                    : '再试一次吧！'}
                </p>
              </div>
            </motion.div>
          )}

          {/* Next Button */}
          {score !== null && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleNext}
              className="w-full btn-primary py-3 rounded-2xl font-semibold"
            >
              下一个句子 →
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
