import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Volume2, Zap, Clock, Trophy, RotateCcw, Play } from 'lucide-react'
import { db } from '../../db/db'
import { speak } from '../../tts/tts'
import { Word } from '../../types'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const CHALLENGE_DURATION = 60 // 60秒挑战

export default function ChallengePage() {
  const navigate = useNavigate()
  const { trackId } = useParams<{ trackId: string }>()

  const track = useLiveQuery(() => trackId ? db.tracks.get(trackId) : undefined)
  // 只加载已学过的单词（mastery >= 1）
  const learnedWords = useLiveQuery(() =>
    db.words.filter(w => w.trackTags.includes(trackId ?? '') && w.mastery >= 1).toArray()
  , [trackId])
  // 用于生成干扰项的全部词池
  const allWords = useLiveQuery(() =>
    db.words.filter(w => w.trackTags.includes(trackId ?? '')).toArray()
  , [trackId])

  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready')
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_DURATION)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [showComboEffect, setShowComboEffect] = useState(false)
  const [showScoreEffect, setShowScoreEffect] = useState<number | null>(null)

  const timerRef = useRef<number | null>(null)

  // 随机打乱已学单词并循环使用
  const shuffledWords = useMemo(() => {
    if (!learnedWords) return []
    // 打乱并重复多次以确保足够题目
    const shuffled = shuffle(learnedWords)
    return [...shuffled, ...shuffle(learnedWords), ...shuffle(learnedWords)]
  }, [learnedWords])

  const currentWord = shuffledWords[currentIndex]

  // 生成选项
  const options = useMemo(() => {
    if (!currentWord || !allWords || allWords.length < 4) return []
    const correctAnswer = currentWord.meaning
    const distractors = shuffle(
      allWords.filter(w => w.id !== currentWord.id).map(w => w.meaning)
    ).slice(0, 3)
    return shuffle([correctAnswer, ...distractors])
  }, [currentWord, allWords])

  // 计时器
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = window.setTimeout(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('finished')
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [gameState, timeLeft])

  const startGame = () => {
    setGameState('playing')
    setTimeLeft(CHALLENGE_DURATION)
    setCurrentIndex(0)
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setCorrectCount(0)
    setSelectedOption(null)
  }

  const handleAnswer = useCallback((option: string) => {
    if (selectedOption !== null || gameState !== 'playing') return

    const correct = option === currentWord?.meaning
    setSelectedOption(option)

    if (correct) {
      const newCombo = combo + 1
      setCombo(newCombo)
      setCorrectCount(prev => prev + 1)
      if (newCombo > maxCombo) setMaxCombo(newCombo)

      // 计分：基础分 + 连击加成
      const baseScore = 10
      const comboBonus = Math.min(newCombo - 1, 10) * 2 // 最多 +20 连击加成
      const earnedScore = baseScore + comboBonus
      setScore(prev => prev + earnedScore)
      setShowScoreEffect(earnedScore)
      setTimeout(() => setShowScoreEffect(null), 600)

      // 连击特效
      if (newCombo >= 3 && newCombo % 3 === 0) {
        setShowComboEffect(true)
        setTimeout(() => setShowComboEffect(false), 800)
      }

      // 快速进入下一题
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1)
        setSelectedOption(null)
      }, 300)
    } else {
      setCombo(0)
      // 错误也快速进入下一题
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1)
        setSelectedOption(null)
      }, 500)
    }
  }, [selectedOption, currentWord, combo, maxCombo, gameState])

  const handlePlayAudio = () => {
    if (currentWord) speak(currentWord.word)
  }

  if (!track || !learnedWords || !allWords) {
    return (
      <div className="page pb-32">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  // 已学单词不足
  if (learnedWords.length === 0) {
    return (
      <div className="page pb-32">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-600">
          <ArrowLeft size={20} />
          返回
        </button>
        <div className="card text-center">
          <p className="text-4xl mb-4">📚</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">还没有学过单词</h2>
          <p className="text-gray-600 mb-6">先去完成关卡学习一些单词，再来挑战吧！</p>
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

  // 准备界面
  if (gameState === 'ready') {
    return (
      <div className="page pb-32">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-600">
          <ArrowLeft size={20} />
          返回
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={40} className="text-white" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">限时挑战</h1>
          <p className="text-gray-600 mb-6">
            {CHALLENGE_DURATION} 秒内答对尽可能多的题目<br/>
            连击可获得额外加分！
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <span className="text-2xl">{track.icon}</span>
              <span className="font-semibold">{track.name}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{learnedWords.length} 个已学词汇</p>
          </div>

          <motion.button
            onClick={startGame}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
          >
            <Play size={24} />
            开始挑战
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // 结束界面
  if (gameState === 'finished') {
    const avgTimePerQuestion = correctCount > 0 ? Math.round(CHALLENGE_DURATION / correctCount * 10) / 10 : 0
    return (
      <div className="page pb-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy size={40} className="text-white" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">挑战结束！</h2>

          {/* 大分数展示 */}
          <div className="my-6">
            <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
              {score}
            </p>
            <p className="text-gray-500">总分</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xl font-bold text-green-600">{correctCount}</p>
              <p className="text-xs text-gray-600">答对</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-xl font-bold text-amber-600">{maxCombo}</p>
              <p className="text-xs text-gray-600">最高连击</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xl font-bold text-blue-600">{avgTimePerQuestion}s</p>
              <p className="text-xs text-gray-600">平均用时</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={startGame}
              className="flex-1 py-3 border-2 border-amber-300 bg-amber-50 rounded-xl font-semibold text-amber-700 flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              再战一次
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold"
            >
              返回
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // 游戏进行中
  return (
    <div className="page pb-32">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full font-bold flex items-center gap-1 ${
            timeLeft <= 10 ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-700'
          }`}>
            <Clock size={16} />
            {timeLeft}s
          </div>
        </div>

        <div className="flex items-center gap-3">
          {combo >= 3 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
              🔥 {combo}
            </span>
          )}
          <div className="text-lg font-bold text-gray-900">
            {score} <span className="text-sm text-gray-500">分</span>
          </div>
        </div>
      </div>

      {/* 分数飘字效果 */}
      <AnimatePresence>
        {showScoreEffect !== null && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            className="fixed top-20 right-8 text-green-500 font-bold text-xl pointer-events-none"
          >
            +{showScoreEffect}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 题目卡片 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.15 }}
          className="card mb-6"
        >
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-gray-900 mb-2">{currentWord?.word}</p>
            {currentWord?.phonetic && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-500">{currentWord.phonetic}</span>
                <button onClick={handlePlayAudio} className="p-1 text-brand-600">
                  <Volume2 size={18} />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 选项 */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((option, idx) => {
          const isCorrect = option === currentWord?.meaning
          const isSelected = selectedOption === option

          return (
            <motion.button
              key={`${currentIndex}-${idx}`}
              onClick={() => handleAnswer(option)}
              disabled={selectedOption !== null}
              whileHover={selectedOption === null ? { scale: 1.03 } : {}}
              whileTap={selectedOption === null ? { scale: 0.97 } : {}}
              className={`p-4 rounded-xl text-center font-semibold transition border-2 ${
                selectedOption === null
                  ? 'border-gray-200 bg-white hover:border-brand-300'
                  : isSelected
                    ? isCorrect
                      ? 'border-green-500 bg-green-100 text-green-800'
                      : 'border-red-500 bg-red-100 text-red-800'
                    : isCorrect
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50 text-gray-400'
              }`}
            >
              {option}
            </motion.button>
          )
        })}
      </div>

      {/* 连击特效 */}
      <AnimatePresence>
        {showComboEffect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-full shadow-2xl">
              <Zap size={28} />
              <span className="text-3xl font-black">{combo}x</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
