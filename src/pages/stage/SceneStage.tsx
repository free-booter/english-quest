import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { Word, Hotspot } from '../../types'
import WordCard from '../../components/WordCard'
import { getScene } from '../../data/loaders'
import { completeStageWithProgress } from '../../services/progress'

type PlayPhase = 'intro' | 'explore' | 'questions' | 'summary'

export default function SceneStage() {
  const navigate = useNavigate()
  const { stageId } = useParams<{ stageId: string }>()
  const [phase, setPhase] = useState<PlayPhase>('intro')
  const [learnedWordIds, setLearnedWordIds] = useState<Set<string>>(new Set())
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isQuestionCorrect, setIsQuestionCorrect] = useState<boolean | null>(null)
  const [showXpGain, setShowXpGain] = useState(false)
  const autoContinueTimer = useRef<number | null>(null)

  const scene = useMemo(() => {
    if (!stageId) return null
    return getScene(stageId)
  }, [stageId])

  const currentQuestion = scene?.questions[questionIndex]
  const totalQuestions = scene?.questions.length ?? 0
  const allHotspotsLearned = scene ? learnedWordIds.size === scene.hotspots.length : false
  const progressPercent = scene
    ? Math.round(
        ((learnedWordIds.size + (phase === 'questions' ? scene.hotspots.length : 0)) /
          (scene.hotspots.length + totalQuestions)) *
          100
      )
    : 0

  const words = useLiveQuery(() => db.words.toArray())

  const getWordData = (wordId: string) => {
    return words?.find((w) => w.id === wordId) || null
  }

  const handleHotspotClick = (hotspot: Hotspot) => {
    const word = getWordData(hotspot.wordId)
    if (word) {
      setSelectedWord(word)
      setSelectedHotspot(hotspot)
      setLearnedWordIds((prev) => new Set([...prev, hotspot.wordId]))
    }
  }

  const handleAnswerQuestion = (option: string) => {
    if (!currentQuestion || phase !== 'questions') return
    const correct = option === currentQuestion.correctOption
    setSelectedOption(option)
    setIsQuestionCorrect(correct)
    if (correct) {
      setCorrectCount((prev) => prev + 1)
    }

    if (autoContinueTimer.current) {
      window.clearTimeout(autoContinueTimer.current)
    }
    autoContinueTimer.current = window.setTimeout(() => {
      handleContinueQuestion()
    }, 700)
  }

  const handleContinueQuestion = () => {
    if (questionIndex < totalQuestions - 1) {
      setQuestionIndex((prev) => prev + 1)
      setSelectedOption(null)
      setIsQuestionCorrect(null)
    } else {
      setPhase('summary')
    }
  }

  const handleContinueExplore = () => {
    if (allHotspotsLearned && scene) {
      setPhase('questions')
      setQuestionIndex(0)
    }
  }

  const handleCompleteStage = async () => {
    if (!stageId) return
    const earnedStars = calcStars()
    await completeStageWithProgress(stageId, earnedStars)
    setShowXpGain(true)
    setTimeout(() => {
      navigate('/tracks')
    }, 1000)
  }

  const calcStars = () => {
    if (totalQuestions === 0) return 0 as 0 | 1 | 2 | 3
    const accuracy = (correctCount / totalQuestions) * 100
    if (accuracy >= 90) return 3
    if (accuracy >= 70) return 2
    if (accuracy >= 50) return 1
    return 0
  }

  if (!scene) {
    return (
      <div className="page pb-32">
        <p className="text-gray-500">场景数据加载中...</p>
      </div>
    )
  }

  return (
    <div className="page pb-32 bg-gradient-to-b from-blue-50 to-white">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition">
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-brand-700">场景探索</h1>
        <div className="w-10" />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">学习进度</span>
          <span className="text-xs text-gray-500">{progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="card mb-6"
          >
            <p className="text-sm text-gray-500 mb-2">场景导入</p>
            <p className="text-lg font-semibold text-gray-800 mb-4">{scene.intro}</p>
            <button onClick={() => setPhase('explore')} className="w-full btn-primary py-3 rounded-2xl">
              开始探索
            </button>
          </motion.div>
        )}

        {phase === 'explore' && (
          <motion.div
            key="explore"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {/* 插画区域占位符 */}
            <div className="card relative bg-gradient-to-b from-blue-100 to-blue-50 h-64 flex items-center justify-center overflow-hidden">
              <svg className="w-full h-full opacity-10" viewBox="0 0 500 400" fill="none">
                <rect x="50" y="150" width="150" height="120" stroke="currentColor" strokeWidth="2" fill="none" />
                <circle cx="280" cy="180" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
                <rect x="350" y="200" width="80" height="60" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>

              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-400 text-center">
                  <span className="text-6xl mb-2 block">🧳</span>
                  旅行打包场景
                </p>
              </div>

              {/* 热点覆盖层 */}
              {scene && scene.hotspots.map((hotspot) => {
                const isLearned = learnedWordIds.has(hotspot.wordId)
                return (
                  <motion.button
                    key={hotspot.id}
                    onClick={() => handleHotspotClick(hotspot)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute transition"
                    style={{
                      left: `${(hotspot.x / 500) * 100}%`,
                      top: `${(hotspot.y / 400) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div
                      className={`rounded-full border-2 flex items-center justify-center font-bold text-sm transition ${
                        isLearned
                          ? 'bg-green-200 border-green-500 text-green-700 w-16 h-16'
                          : 'bg-yellow-200 border-yellow-500 text-yellow-700 w-14 h-14 hover:w-16 hover:h-16'
                      }`}
                      style={{ width: hotspot.radius * 2, height: hotspot.radius * 2 }}
                    >
                      {isLearned ? '✓' : '?'}
                    </div>
                  </motion.button>
                )
              })}
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card py-3 text-center">
                <p className="text-xs text-gray-500 font-semibold">已学词汇</p>
                <p className="text-2xl font-bold text-blue-600">{learnedWordIds.size}/{scene.hotspots.length}</p>
              </div>
              <div className="card py-3 text-center">
                <p className="text-xs text-gray-500 font-semibold">完成度</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round((learnedWordIds.size / scene.hotspots.length) * 100)}%
                </p>
              </div>
            </div>

            {/* 已学词汇列表 */}
            {learnedWordIds.size > 0 && (
              <div className="card">
                <p className="text-sm font-semibold text-gray-700 mb-2">已学词汇</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(learnedWordIds).map((wordId) => {
                    const word = getWordData(wordId)
                    return (
                      <span key={wordId} className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-700 font-semibold">
                        {word?.word}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 继续按钮 */}
            <button
              onClick={handleContinueExplore}
              disabled={!allHotspotsLearned}
              className={`w-full py-3 rounded-2xl font-semibold transition ${
                allHotspotsLearned ? 'btn-primary' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {allHotspotsLearned ? '进入理解题 →' : '点击所有热点后继续'}
            </button>
          </motion.div>
        )}

        {phase === 'questions' && currentQuestion && (
          <motion.div
            key={`question-${questionIndex}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4"
          >
            <div className="card">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">理解题 {questionIndex + 1}/{totalQuestions}</p>
              <p className="text-lg font-semibold text-gray-800">{currentQuestion.prompt}</p>
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <motion.button
                  key={option}
                  onClick={() => handleAnswerQuestion(option)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`w-full card text-left font-semibold transition border ${
                    selectedOption === option
                      ? isQuestionCorrect
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                      : 'border-transparent hover:border-blue-300'
                  }`}
                >
                  {option}
                </motion.button>
              ))}
            </div>

            {selectedOption && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl text-sm font-semibold ${
                  isQuestionCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {isQuestionCorrect ? '✓ 回答正确！' : '✗ 再想想...'}
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="card mb-6"
          >
            <p className="text-sm text-gray-500 mb-1">学习完成！</p>
            <p className="text-lg font-semibold text-gray-800 mb-4">太棒了！你已经探索完成这个场景。</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3">
                <p className="text-xs text-gray-600 font-semibold">学习词汇</p>
                <p className="text-2xl font-bold text-blue-600">{learnedWordIds.size}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3">
                <p className="text-xs text-gray-600 font-semibold">星级评分</p>
                <p className="text-2xl font-bold text-amber-600">{'★'.repeat(calcStars())}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-4">
              正确率：{totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0}%
            </p>

            <button onClick={handleCompleteStage} className="w-full btn-primary py-3 rounded-2xl font-semibold">
              完成并领取 +20 XP
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <WordCard word={selectedWord} hint={selectedHotspot?.hint} onClose={() => setSelectedWord(null)} />

      <AnimatePresence>
        {showXpGain && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: -26, scale: 0.95 }}
            transition={{ duration: 0.6 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-green-500 text-white font-bold px-4 py-2 rounded-full shadow-lg"
          >
            +20 XP
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
