import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Volume2, Zap, Clock, MessageCircle } from 'lucide-react'
import { db } from '../../db/db'
import { speak } from '../../tts/tts'
import { ReviewItem, Word } from '../../types'

function PracticeSection({ trackId }: { trackId: string }) {
  const navigate = useNavigate()
  const items = [
    { label: '快速刷词', icon: <Zap size={20} className="text-amber-500" />, path: `/quick-quiz/${trackId}` },
    { label: '限时挑战', icon: <Clock size={20} className="text-red-500" />, path: `/challenge/${trackId}` },
    { label: '对话练习', icon: <MessageCircle size={20} className="text-purple-500" />, path: `/dialogue/${trackId}` },
  ]
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500 mb-3">练习巩固</p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <motion.button
            key={item.path}
            onClick={() => navigate(item.path)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="p-3 bg-white rounded-xl border border-gray-200 hover:border-brand-300 transition text-center"
          >
            <div className="flex justify-center mb-1">{item.icon}</div>
            <p className="text-xs font-semibold text-gray-700">{item.label}</p>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const navigate = useNavigate()
  const settings = useLiveQuery(() => db.userSettings.toCollection().first())
  const reviewItems = useLiveQuery(() => {
    const today = new Date().toISOString().split('T')[0]
    return db.reviews
      .where('nextReviewDate')
      .belowOrEqual(today)
      .toArray()
  })

  const [reviewWords, setReviewWords] = useState<(ReviewItem & { word?: Word })[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!reviewItems) return

    Promise.all(
      reviewItems.map(async (item) => ({
        ...item,
        word: await db.words.get(item.wordId),
      }))
    ).then((items) => {
      setReviewWords(items.filter((item) => item.word))
    })
  }, [reviewItems])

  const currentItem = reviewWords[currentIndex]
  const currentWord = currentItem?.word
  const trackId = settings?.primaryTrack ?? 'travel'

  const handleMarkCorrect = async () => {
    if (!currentItem) return

    const newInterval = Math.min(
      30,
      [1, 2, 4, 7, 15, 30].find(
        (i) => i > (currentItem.intervalDay as any)
      ) || 30
    ) as 1 | 2 | 4 | 7 | 15 | 30

    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + newInterval)

    await db.reviews.update(currentItem.wordId, {
      nextReviewDate: nextDate.toISOString().split('T')[0],
      intervalDay: newInterval,
    })

    setScore(score + 1)
    setTotal(total + 1)
    handleNext()
  }

  const handleMarkWrong = async () => {
    if (!currentItem) return

    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 1)

    await db.reviews.update(currentItem.wordId, {
      nextReviewDate: nextDate.toISOString().split('T')[0],
      intervalDay: 1,
      failCount: currentItem.failCount + 1,
    })

    setTotal(total + 1)
    handleNext()
  }

  const handleNext = () => {
    if (currentIndex < reviewWords.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    } else {
      setDone(true)
    }
  }

  // 空状态：无复习词
  if (!reviewWords || reviewWords.length === 0) {
    return (
      <div className="page pb-32">
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-xl transition mb-4"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-4xl font-bold text-brand-700" style={{ fontFamily: 'Poppins' }}>
            复习模式
          </h1>
          <p className="text-sm text-gray-400 mt-1">温故而知新</p>
        </div>

        <div className="card-accent text-center py-12 flex flex-col items-center justify-center mb-6">
          <span className="text-6xl mb-4">✨</span>
          <p className="text-gray-600 text-lg font-semibold">今天没有需要复习的词语</p>
          <p className="text-sm text-gray-400 mt-2">明天见 👋</p>
        </div>

        <PracticeSection trackId={trackId} />
      </div>
    )
  }

  // 完成状态
  if (done) {
    const accuracy = total > 0 ? Math.round((score / total) * 100) : 0
    return (
      <div className="page pb-32">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-xl transition mb-6"
        >
          <ChevronLeft size={24} className="text-gray-600" />
        </button>

        <div className="card text-center py-10 mb-6">
          <span className="text-5xl mb-4 block">🎉</span>
          <p className="text-xl font-bold text-gray-900 mb-1">复习完成！</p>
          <p className="text-gray-500 text-sm mb-4">
            共复习 {total} 个词，正确率 {accuracy}%
          </p>
          <div className="text-4xl font-bold text-brand-600">{accuracy}%</div>
        </div>

        <PracticeSection trackId={trackId} />
      </div>
    )
  }

  if (!currentWord) return null

  return (
    <div className="page pb-32">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-xl transition"
        >
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-brand-700" style={{ fontFamily: 'Poppins' }}>
          复习
        </h1>
        <div className="w-10" />
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">
            {currentIndex + 1} / {reviewWords.length}
          </span>
          <span className="text-xs text-gray-400">正确率 {total > 0 ? Math.round((score / total) * 100) : 0}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-600"
            animate={{ width: `${((currentIndex + 1) / reviewWords.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentWord.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <motion.div
            onClick={() => setIsFlipped(!isFlipped)}
            className="h-80 rounded-3xl cursor-pointer card-accent flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="text-5xl font-bold text-brand-700 mb-4" style={{ fontFamily: 'Poppins' }}>
              {isFlipped ? currentWord.meaning : currentWord.word}
            </div>
            <div className="flex items-center gap-2 justify-center mb-4">
              <span className="text-sm text-gray-500">
                {isFlipped ? currentWord.pos : currentWord.phonetic}
              </span>
              {!isFlipped && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    speak(currentWord.word)
                  }}
                  className="p-2 hover:bg-brand-100 rounded-full transition"
                >
                  <Volume2 size={18} className="text-brand-500" />
                </button>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-6">点击翻转</div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      {isFlipped && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
          <button
            onClick={handleMarkWrong}
            className="flex-1 bg-red-100 text-red-700 font-semibold py-3 rounded-2xl hover:bg-red-200 transition"
          >
            ❌ 不认识
          </button>
          <button
            onClick={handleMarkCorrect}
            className="flex-1 bg-green-100 text-green-700 font-semibold py-3 rounded-2xl hover:bg-green-200 transition"
          >
            ✅ 认识
          </button>
        </motion.div>
      )}
    </div>
  )
}
