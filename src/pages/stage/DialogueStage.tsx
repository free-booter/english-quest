import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Volume2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { Word } from '../../types'
import WordCard from '../../components/WordCard'
import { getDialogue } from '../../data/loaders'
import { completeStageWithProgress } from '../../services/progress'

type PlayPhase = 'intro' | 'dialogue' | 'questions' | 'summary'

export default function DialogueStage() {
  const navigate = useNavigate()
  const { stageId } = useParams<{ stageId: string }>()
  const [phase, setPhase] = useState<PlayPhase>('intro')
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const [wordHint, setWordHint] = useState<string>('')
  const [learnedWordIds, setLearnedWordIds] = useState<Set<string>>(new Set())
  const [questionIndex, setQuestionIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isQuestionCorrect, setIsQuestionCorrect] = useState<boolean | null>(null)
  const [showXpGain, setShowXpGain] = useState(false)
  const autoContinueTimer = useRef<number | null>(null)

  const dialogue = useMemo(() => {
    if (!stageId) return null
    return getDialogue(stageId)
  }, [stageId])
  const currentQuestion = !dialogue ? undefined : dialogue.questions[questionIndex]
  const totalQuestions = dialogue?.questions.length ?? 0
  const dialogueWordIds = useMemo(() => {
    if (!dialogue) return []
    return Array.from(new Set(dialogue.lines.flatMap((line) => line.wordsInLine)))
  }, [dialogue])
  const progressPercent = useMemo(() => {
    if (!dialogue) return 0
    if (phase === 'intro') return 0
    if (phase === 'dialogue') {
      if (dialogueWordIds.length === 0) return 60
      return Math.max(30, Math.round((learnedWordIds.size / dialogueWordIds.length) * 60))
    }
    if (phase === 'questions') {
      return 60 + Math.round((questionIndex / Math.max(totalQuestions, 1)) * 40)
    }
    return 100
  }, [dialogue, dialogueWordIds.length, learnedWordIds.size, phase, questionIndex, totalQuestions])

  // 获取词汇数据
  const words = useLiveQuery(() => db.words.toArray())

  const getWordData = (wordId: string) => {
    return words?.find((w) => w.id === wordId) || null
  }

  const handleLineClick = async (wordId: string, lineId: string) => {
    const word = getWordData(wordId)
    if (word && dialogue) {
      // 查询是否有场景提示（从对话行关联的上下文）
      const dialogueLine = dialogue.lines.find((l) => l.id === lineId)
      setSelectedWord(word)
      setWordHint(dialogueLine ? `该词出现在 "${dialogueLine.speaker}" 的对话中` : '')
      setLearnedWordIds((prev) => new Set([...prev, wordId]))
    }
  }

  const handlePlayLineAudio = (audio: string) => {
    // 实际使用中应该播放真实音频，这里用 TTS 代替
    const line = dialogue?.lines.find((l) => l.audio === audio)
    if (line) {
      const utterance = new SpeechSynthesisUtterance(line.text)
      utterance.lang = 'en-US'
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleAnswerQuestion = (option: string) => {
    if (!currentQuestion || phase !== 'questions') return
    if (isQuestionCorrect) return
    const correct = option === currentQuestion.correctOption
    setSelectedOption(option)
    setIsQuestionCorrect(correct)
    if (correct) {
      setCorrectCount((prev) => prev + 1)

      if (autoContinueTimer.current) {
        window.clearTimeout(autoContinueTimer.current)
      }
      autoContinueTimer.current = window.setTimeout(() => {
        handleContinueQuestion()
      }, 700)
    }
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

  const renderDialogueText = (line: NonNullable<typeof dialogue>['lines'][number]) => {
    const matches = line.wordsInLine
      .map((wordId) => {
        const word = getWordData(wordId)
        if (!word) return null
        const start = line.text.toLowerCase().indexOf(word.word.toLowerCase())
        if (start === -1) return null
        return {
          wordId,
          start,
          end: start + word.word.length,
        }
      })
      .filter((match): match is { wordId: string; start: number; end: number } => match !== null)
      .sort((a, b) => a.start - b.start)

    const segments: Array<{ text: string; wordId?: string }> = []
    let cursor = 0
    for (const match of matches) {
      if (match.start < cursor) continue
      if (match.start > cursor) {
        segments.push({ text: line.text.slice(cursor, match.start) })
      }
      segments.push({ text: line.text.slice(match.start, match.end), wordId: match.wordId })
      cursor = match.end
    }
    if (cursor < line.text.length) {
      segments.push({ text: line.text.slice(cursor) })
    }

    return segments.map((segment, idx) => {
      if (!segment.wordId) {
        return <span key={`${line.id}-${idx}`}>{segment.text}</span>
      }

      const isLearned = learnedWordIds.has(segment.wordId)
      return (
        <button
          key={`${line.id}-${segment.wordId}-${idx}`}
          onClick={() => handleLineClick(segment.wordId!, line.id)}
          className={`mx-0.5 rounded-lg px-1.5 py-0.5 font-semibold transition ${
            isLearned
              ? 'bg-purple-200 text-purple-800'
              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          }`}
        >
          {segment.text}
        </button>
      )
    })
  }

  if (!dialogue) {
    return (
      <div className="page pb-32">
        <p className="text-gray-500">对话数据加载中...</p>
      </div>
    )
  }

  return (
    <div className="page pb-32 bg-gradient-to-b from-purple-50 to-white">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition">
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-brand-700">对话学习</h1>
        <div className="w-10" />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">学习进度</span>
          <span className="text-xs text-gray-500">{progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-400 to-purple-600"
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
            <p className="text-lg font-semibold text-gray-800 mb-4">{dialogue.intro}</p>
            <p className="text-xs text-gray-600 mb-4">💡 提示：点击对话中的单词可以学习发音和释义</p>
            <button onClick={() => setPhase('dialogue')} className="w-full btn-primary py-3 rounded-2xl">
              开始对话
            </button>
          </motion.div>
        )}

        {phase === 'dialogue' && (
          <motion.div
            key="dialogue"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4"
          >
            <div className="rounded-3xl bg-white/90 p-4 shadow-sm border border-purple-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-purple-500">完整对话</p>
                  <p className="text-sm text-gray-500">点击黄色短语学习词义，随时可以重听单句</p>
                </div>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-600">
                  {learnedWordIds.size}/{dialogueWordIds.length}
                </span>
              </div>

              <div className="space-y-3">
                {dialogue.lines.map((line, idx) => {
                  const isAlice = line.speaker.toLowerCase() === 'alice'
                  return (
                    <motion.div
                      key={line.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`flex ${isAlice ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[86%] rounded-2xl px-4 py-3 ${
                          isAlice
                            ? 'bg-purple-50 text-gray-900 rounded-tl-md'
                            : 'bg-brand-50 text-gray-900 rounded-tr-md'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <p className={`text-xs font-bold ${isAlice ? 'text-purple-600' : 'text-brand-600'}`}>
                            {line.speaker}
                          </p>
                          <button
                            onClick={() => handlePlayLineAudio(line.audio)}
                            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-purple-600"
                          >
                            <Volume2 size={14} />
                            听
                          </button>
                        </div>
                        <p className="text-base leading-8 text-gray-900">{renderDialogueText(line)}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            <button
              onClick={() => {
                setPhase('questions')
                setQuestionIndex(0)
              }}
              className="w-full btn-primary py-3 rounded-2xl font-semibold"
            >
              读完了，开始理解题 →
            </button>
          </motion.div>
        )}

        {phase === 'questions' && dialogue && currentQuestion && (
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
                      : 'border-transparent hover:border-purple-300'
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
            <p className="text-lg font-semibold text-gray-800 mb-4">很棒！你已经学完了这个对话。</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3">
                <p className="text-xs text-gray-600 font-semibold">学习词汇</p>
                <p className="text-2xl font-bold text-purple-600">{learnedWordIds.size}</p>
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

      <WordCard word={selectedWord} hint={wordHint} onClose={() => setSelectedWord(null)} />

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
