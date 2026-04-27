import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2 } from 'lucide-react'
import { Word } from '../types'

interface WordCardProps {
  word?: Word | null
  hint?: string
  onClose: () => void
  onMarkForReview?: (wordId: string) => void
}

export default function WordCard({ word, hint, onClose, onMarkForReview }: WordCardProps) {
  const handlePlayAudio = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }

  if (!word) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 flex items-end"
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-white rounded-t-3xl p-6 shadow-2xl"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{word.word}</h2>
              {word.phonetic && <p className="text-sm text-gray-600 mt-1">{word.phonetic}</p>}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          <div className="space-y-3 mb-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">{word.pos}</p>
              <p className="text-lg font-semibold text-gray-800">{word.meaning}</p>
            </div>

            {hint && (
              <div className="bg-blue-50 rounded-xl p-3 border-l-4 border-brand-400">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">场景提示</p>
                <p className="text-sm text-gray-700">{hint}</p>
              </div>
            )}

            {word.rootHint && (
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">词根提示</p>
                <p className="text-sm text-gray-700">{word.rootHint}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handlePlayAudio(word.word)}
              className="flex-1 flex items-center justify-center gap-2 btn-primary py-3 rounded-2xl"
            >
              <Volume2 size={18} />
              <span>听发音</span>
            </button>
            {onMarkForReview && (
              <button
                onClick={() => {
                  onMarkForReview(word.id)
                  onClose()
                }}
                className="flex-1 btn-secondary py-3 rounded-2xl font-semibold"
              >
                标记复习
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
