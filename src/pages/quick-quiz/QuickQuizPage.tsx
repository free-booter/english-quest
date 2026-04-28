import { useState, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Volume2, Zap, RotateCcw } from 'lucide-react'
import { db } from '../../db/db'
import { speak } from '../../tts/tts'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function QuickQuizPage() {
  const navigate = useNavigate()
  const { trackId } = useParams<{ trackId: string }>()

  const track = useLiveQuery(() => trackId ? db.tracks.get(trackId) : undefined)
  // 只加载已学过的单词（mastery >= 1）
  const allWords = useLiveQuery(() =>
    db.words.filter(w => w.trackTags.includes(trackId ?? '') && w.mastery >= 1).toArray()
  , [trackId])
  // 用于生成干扰项的全部单词池
  const wordPool = useLiveQuery(() =>
    db.words.filter(w => w.trackTags.includes(trackId ?? '')).toArray()
  , [trackId])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [showComboEffect, setShowComboEffect] = useState(false)
  const [quizMode, setQuizMode] = useState<'en2zh' | 'zh2en' | 'listen'>('en2zh')
  const [isFinished, setIsFinished] = useState(false)

  // 随机打乱单词顺序
  const shuffledWords = useMemo(() => {
    if (!allWords) return []
    return shuffle(allWords)
  }, [allWords])

  const currentWord = shuffledWords[currentIndex]

  // 生成选项（干扰项从全部词池中选，确保有足够选项）
  const options = useMemo(() => {
    if (!currentWord || !wordPool || wordPool.length < 4) return []

    const correctAnswer = quizMode === 'en2zh' || quizMode === 'listen'
      ? currentWord.meaning
      : currentWord.word

    // 获取3个干扰项（从全部词池中选）
    const distractors = shuffle(
      wordPool
        .filter(w => w.id !== currentWord.id)
        .map(w => quizMode === 'en2zh' || quizMode === 'listen' ? w.meaning : w.word)
    ).slice(0, 3)

    return shuffle([correctAnswer, ...distractors])
  }, [currentWord, wordPool, quizMode])

  const handleAnswer = useCallback((option: string) => {
    if (selectedOption !== null) return

    const correctAnswer = quizMode === 'en2zh' || quizMode === 'listen'
      ? currentWord?.meaning
      : currentWord?.word

    const correct = option === correctAnswer
    setSelectedOption(option)
    setIsCorrect(correct)
    setTotalAnswered(prev => prev + 1)

    if (correct) {
      const newCombo = combo + 1
      setCombo(newCombo)
      setCorrectCount(prev => prev + 1)
      if (newCombo > maxCombo) setMaxCombo(newCombo)

      // 连击特效
      if (newCombo >= 3) {
        setShowComboEffect(true)
        setTimeout(() => setShowComboEffect(false), 800)
      }

      // 自动下一题
      setTimeout(() => {
        if (currentIndex < shuffledWords.length - 1) {
          setCurrentIndex(prev => prev + 1)
          setSelectedOption(null)
          setIsCorrect(null)
        } else {
          setIsFinished(true)
        }
      }, 500)
    } else {
      setCombo(0)
      // 错误后等待用户点击继续
    }
  }, [selectedOption, currentWord, combo, maxCombo, currentIndex, shuffledWords.length, quizMode])

  const handleContinue = () => {
    if (currentIndex < shuffledWords.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOption(null)
      setIsCorrect(null)
    } else {
      setIsFinished(true)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedOption(null)
    setIsCorrect(null)
    setCombo(0)
    setMaxCombo(0)
    setCorrectCount(0)
    setTotalAnswered(0)
    setIsFinished(false)
  }

  const handlePlayAudio = () => {
    if (currentWord) speak(currentWord.word)
  }

  if (!track || !allWords) {
    return (
      <div className="page pb-32">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  // 已学单词不足
  if (allWords.length === 0) {
    return (
      <div className="page pb-32">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-600">
          <ArrowLeft size={20} />
          返回
        </button>
        <div className="card text-center">
          <p className="text-4xl mb-4">📚</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">还没有学过单词</h2>
          <p className="text-gray-600 mb-6">先去完成关卡学习一些单词，再来练习吧！</p>
          <button
            onClick={() => navigate(`/track/${trackId}`)}
            className="w-full py-3 bg-brand-500 text-white rounded-xl font-semibold"
          >
            去学习
          </button>
        </div>
      </div>
    )
  }

  if (isFinished) {
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0
    return (
      <div className="page pb-32">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-600">
          <ArrowLeft size={20} />
          返回
        </button>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center"
        >
          <p className="text-4xl mb-4">🎉</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">练习完成！</h2>
          <p className="text-gray-600 mb-6">你完成了 {totalAnswered} 道题目</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-green-600">{accuracy}%</p>
              <p className="text-xs text-gray-600">正确率</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-blue-600">{correctCount}</p>
              <p className="text-xs text-gray-600">答对</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-amber-600">{maxCombo}</p>
              <p className="text-xs text-gray-600">最高连击</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRestart}
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              再来一次
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-3 bg-brand-500 text-white rounded-xl font-semibold"
            >
              返回
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="page pb-32">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{currentIndex + 1}/{shuffledWords.length}</span>
          {combo >= 3 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full animate-pulse">
              🔥 {combo} 连击
            </span>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-brand-400 to-brand-600"
          animate={{ width: `${((currentIndex + 1) / shuffledWords.length) * 100}%` }}
        />
      </div>

      {/* 模式切换 */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'en2zh', label: '英→中' },
          { key: 'zh2en', label: '中→英' },
          { key: 'listen', label: '听音' },
        ].map(mode => (
          <button
            key={mode.key}
            onClick={() => setQuizMode(mode.key as any)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              quizMode === mode.key
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* 题目卡片 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="card mb-6"
        >
          {quizMode === 'listen' ? (
            <div className="text-center py-8">
              <button
                onClick={handlePlayAudio}
                className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 hover:bg-brand-200 transition"
              >
                <Volume2 size={32} className="text-brand-600" />
              </button>
              <p className="text-gray-500">点击播放，选择对应的中文</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {quizMode === 'en2zh' ? currentWord?.word : currentWord?.meaning}
              </p>
              {quizMode === 'en2zh' && currentWord?.phonetic && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-500">{currentWord.phonetic}</span>
                  <button onClick={handlePlayAudio} className="p-1 text-brand-600">
                    <Volume2 size={18} />
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 选项 */}
      <div className="space-y-3">
        {options.map((option, idx) => {
          const correctAnswer = quizMode === 'en2zh' || quizMode === 'listen'
            ? currentWord?.meaning
            : currentWord?.word
          const isThisCorrect = option === correctAnswer
          const isSelected = selectedOption === option

          return (
            <motion.button
              key={`${currentIndex}-${idx}`}
              onClick={() => handleAnswer(option)}
              disabled={selectedOption !== null}
              whileHover={selectedOption === null ? { scale: 1.02 } : {}}
              whileTap={selectedOption === null ? { scale: 0.98 } : {}}
              className={`w-full p-4 rounded-xl text-left font-semibold transition border-2 ${
                selectedOption === null
                  ? 'border-gray-200 hover:border-brand-300 bg-white'
                  : isSelected
                    ? isCorrect
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-red-500 bg-red-50 text-red-800'
                    : isThisCorrect
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 bg-gray-50 text-gray-400'
              }`}
            >
              {option}
            </motion.button>
          )
        })}
      </div>

      {/* 错误后继续按钮 */}
      {selectedOption !== null && !isCorrect && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleContinue}
          className="w-full mt-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold"
        >
          继续
        </motion.button>
      )}

      {/* 连击特效 */}
      <AnimatePresence>
        {showComboEffect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: -20 }}
            exit={{ opacity: 0, scale: 1.5, y: -40 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-full shadow-lg">
              <Zap size={24} />
              <span className="text-2xl font-black">{combo} 连击!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
