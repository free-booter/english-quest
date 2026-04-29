import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, X, ChevronRight, BookOpen } from 'lucide-react'
import { db } from '../../db/db'
import { speak } from '../../tts/tts'
import { buildFallbackScenario, getStageScenario } from '../../data/stage-scenarios'
import { Word } from '../../types'
import { completeStageWithProgress } from '../../services/progress'

type PlayPhase = 'intro' | 'learning' | 'quiz' | 'reorder' | 'summary'

function tokenize(sentence: string): string[] {
  return sentence.split(/\s+/).filter(Boolean)
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildFallbackExamples(word: Word): Array<{ en: string; zh: string }> {
  return [
    {
      en: `I need my ${word.word} before I leave.`,
      zh: `出发前我需要${word.meaning}。`,
    },
  ]
}

function buildMemoryHint(word: Word): string {
  if (word.memoryAid) return word.memoryAid
  if (word.roots) return word.roots
  if (word.rootHint) return word.rootHint
  const parts = word.word.split(/[\s-]+/).filter(Boolean)
  if (parts.length > 1) {
    return `把短语拆成 ${parts.join(' + ')}，和「${word.meaning}」场景绑定记忆。`
  }
  return `把「${word.word}」和它的中文意思「${word.meaning}」放在同一个场景画面里记忆。`
}

function buildRelatedWords(word: Word): string[] {
  if (word.relatedWords && word.relatedWords.length > 0) {
    return word.relatedWords.map((item) => item.word)
  }
  if (word.family && word.family.length > 0) return word.family
  return []
}

function HighlightedSentence({ sentence, word }: { sentence: string; word: string }) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = sentence.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === word.toLowerCase() ? (
          <strong key={i} className="text-brand-600">{part}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

interface CardStageProps {
  onComplete: () => void
}

export default function CardStage({ onComplete }: CardStageProps) {
  const { stageId } = useParams<{ stageId: string }>()
  const stage = useLiveQuery(() => (stageId ? db.stages.get(stageId) : undefined))
  const words = useLiveQuery(() => {
    if (!stage) return undefined as any
    return db.words.where('id').anyOf(stage.wordIds).toArray()
  }, [stage])

  const [phase, setPhase] = useState<PlayPhase>('intro')
  const [learningIndex, setLearningIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [, setCombo] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isStepCorrect, setIsStepCorrect] = useState<boolean | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [showXpGain, setShowXpGain] = useState(false)
  const [hasFailedCurrentStep, setHasFailedCurrentStep] = useState(false)
  const [reorderIndex, setReorderIndex] = useState(0)
  const [pickedTokens, setPickedTokens] = useState<string[]>([])
  const [poolTokens, setPoolTokens] = useState<string[]>([])
  const [reorderResult, setReorderResult] = useState<'pending' | 'correct' | 'wrong'>('pending')
  const [showWordDetail, setShowWordDetail] = useState(false)
  const [spellInput, setSpellInput] = useState('')
  const autoContinueTimer = useRef<number | null>(null)

  const scenario = useMemo(() => {
    if (!stage || !words || words.length === 0) return null
    return getStageScenario(stage.id) ?? buildFallbackScenario(stage.id, stage.title, words)
  }, [stage, words])

  const totalSteps = scenario?.steps.length ?? 0
  const currentStep = scenario?.steps[stepIndex]
  const currentWord = words?.[learningIndex]

  const learningExamples = useMemo<Array<{ en: string; zh: string }>>(() => {
    if (!currentWord) return []
    if (currentWord.teachingExamples && currentWord.teachingExamples.length > 0) {
      return currentWord.teachingExamples
    }
    if (currentWord.examples && currentWord.examples.length > 0) return currentWord.examples
    return buildFallbackExamples(currentWord)
  }, [currentWord])

  const memoryHint = useMemo(() => currentWord ? buildMemoryHint(currentWord) : '', [currentWord])
  const relatedWords = useMemo(() => currentWord ? buildRelatedWords(currentWord) : [], [currentWord])

  const reorderPool = useMemo(() => {
    if (!words) return [] as Array<{ en: string; zh: string }>
    const candidates: Array<{ en: string; zh: string }> = []
    for (const w of words as Word[]) {
      if (w.examples && w.examples.length > 0) {
        const ex = w.examples[0]
        if (tokenize(ex.en).length <= 10) {
          candidates.push(ex)
        }
      }
    }
    return candidates.slice(0, 2)
  }, [words])

  const currentReorder = reorderPool[reorderIndex]
  const correctTokens = useMemo(() => (currentReorder ? tokenize(currentReorder.en) : []), [currentReorder])
  const hasReorder = reorderPool.length > 0

  const progressPercent = useMemo(() => {
    if (phase === 'intro') return 0
    const learningWeight = 40
    const quizWeight = hasReorder ? 40 : 60
    const reorderWeight = hasReorder ? 20 : 0
    if (phase === 'learning' && words) {
      return Math.round(((learningIndex + 1) / words.length) * learningWeight)
    }
    if (phase === 'quiz') {
      return learningWeight + Math.round((stepIndex / totalSteps) * quizWeight)
    }
    if (phase === 'reorder' && hasReorder) {
      return learningWeight + quizWeight + Math.round((reorderIndex / reorderPool.length) * reorderWeight)
    }
    return 100
  }, [phase, learningIndex, words, stepIndex, totalSteps, reorderIndex, reorderPool.length, hasReorder])

  const calcStars = () => {
    if (!scenario || scenario.steps.length === 0) return 0 as 0 | 1 | 2 | 3
    const accuracy = (correctCount / scenario.steps.length) * 100
    if (accuracy >= 90) return 3
    if (accuracy >= 70) return 2
    if (accuracy >= 50) return 1
    return 0
  }

  useEffect(() => {
    return () => {
      if (autoContinueTimer.current) window.clearTimeout(autoContinueTimer.current)
    }
  }, [])

  const handlePlayWordAudio = (word: Word) => speak(word.word)
  const handlePlayExampleAudio = (sentence: string) => speak(sentence)

  const handleContinueLearning = () => {
    if (!words) return
    setShowWordDetail(false)
    if (learningIndex < words.length - 1) {
      setLearningIndex((prev) => prev + 1)
    } else {
      setPhase('quiz')
      setStepIndex(0)
    }
  }

  const handleNotSure = async () => {
    if (currentWord) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const existing = await db.reviews.get(currentWord.id)
      if (!existing) {
        await db.reviews.add({
          wordId: currentWord.id,
          nextReviewDate: tomorrow.toISOString().split('T')[0],
          intervalDay: 1,
          failCount: 0,
        })
      }
    }
    handleContinueLearning()
  }

  const findWordIdByText = (text: string): string => {
    if (!words) return ''
    return (words as Word[]).find((w) => w.word === text)?.id ?? ''
  }

  // context 类型 correctOption 是中文，需用 targetWord 查词
  const getTrackingWordId = (): string => {
    if (!currentStep) return ''
    const wordText = currentStep.targetWord ?? currentStep.correctOption
    return findWordIdByText(wordText)
  }

  const recordWrongAnswer = async (wrongOption: string) => {
    if (!stage || !currentStep) return
    const wordId = getTrackingWordId()
    const prompt = currentStep.prompt
    const existing = await db.wrongAnswers
      .where('stageId')
      .equals(stage.id)
      .and((w: any) => w.questionPrompt === prompt)
      .first()

    if (existing) {
      await db.wrongAnswers.update(existing.id!, {
        wrongOption,
        wrongCount: existing.wrongCount + 1,
        lastWrongAt: Date.now(),
        resolved: false,
      })
    } else {
      await db.wrongAnswers.add({
        wordId,
        stageId: stage.id,
        questionPrompt: currentStep.prompt,
        wrongOption,
        correctOption: currentStep.correctOption,
        wrongCount: 1,
        lastWrongAt: Date.now(),
        resolved: false,
      })
    }
  }

  const markWrongAnswerResolved = async () => {
    if (!stage || !currentStep) return
    const prompt = currentStep.prompt
    const existing = await db.wrongAnswers
      .where('stageId')
      .equals(stage.id)
      .and((w: any) => w.questionPrompt === prompt)
      .first()
    if (existing) {
      await db.wrongAnswers.update(existing.id!, { resolved: true })
    }
  }

  const adjustWordMastery = async (delta: number) => {
    if (!currentStep) return
    const wordId = getTrackingWordId()
    if (!wordId) return
    const word = await db.words.get(wordId)
    if (!word) return
    const next = Math.min(5, Math.max(0, word.mastery + delta)) as 0 | 1 | 2 | 3 | 4 | 5
    await db.words.update(wordId, { mastery: next })
  }

  const handleChooseOption = (option: string) => {
    if (!currentStep || phase !== 'quiz') return
    const correct = option === currentStep.correctOption
    setSelectedOption(option)
    setIsStepCorrect(correct)
    setFeedbackText(correct ? currentStep.successFeedback : currentStep.failFeedback)

    if (correct) {
      setCombo((c) => c + 1)
      setCorrectCount((prev) => prev + 1)
      if (!hasFailedCurrentStep) adjustWordMastery(1)
      else markWrongAnswerResolved()

      if (autoContinueTimer.current) window.clearTimeout(autoContinueTimer.current)
      autoContinueTimer.current = window.setTimeout(() => handleContinueQuiz(), 700)
    } else {
      setCombo(0)
      if (!hasFailedCurrentStep) {
        adjustWordMastery(-1)
        setHasFailedCurrentStep(true)
      }
      recordWrongAnswer(option)
      if (autoContinueTimer.current) window.clearTimeout(autoContinueTimer.current)
    }
  }

  const handleSubmitSpell = () => {
    if (!currentStep || selectedOption !== null) return
    const raw = spellInput.trim()
    if (!raw) return
    const correct = raw.toLowerCase() === currentStep.correctOption.toLowerCase()
    setSelectedOption(raw)
    setIsStepCorrect(correct)
    setFeedbackText(correct ? currentStep.successFeedback : currentStep.failFeedback)

    if (correct) {
      setCombo((c) => c + 1)
      setCorrectCount((prev) => prev + 1)
      if (!hasFailedCurrentStep) adjustWordMastery(1)
      else markWrongAnswerResolved()
      if (autoContinueTimer.current) window.clearTimeout(autoContinueTimer.current)
      autoContinueTimer.current = window.setTimeout(() => handleContinueQuiz(), 900)
    } else {
      setCombo(0)
      if (!hasFailedCurrentStep) {
        adjustWordMastery(-1)
        setHasFailedCurrentStep(true)
      }
      recordWrongAnswer(raw)
    }
  }

  const handleContinueQuiz = () => {
    if (!scenario) return
    if (stepIndex < scenario.steps.length - 1) {
      setStepIndex((prev) => prev + 1)
      setSelectedOption(null)
      setIsStepCorrect(null)
      setFeedbackText('')
      setHasFailedCurrentStep(false)
      setSpellInput('')
    } else if (hasReorder) {
      setPhase('reorder')
      setReorderIndex(0)
      setPoolTokens(shuffle(tokenize(reorderPool[0].en)))
      setPickedTokens([])
      setReorderResult('pending')
    } else {
      setPhase('summary')
    }
  }

  const handlePickToken = (idx: number) => {
    if (reorderResult === 'correct') return
    const token = poolTokens[idx]
    setPoolTokens((prev) => prev.filter((_, i) => i !== idx))
    setPickedTokens((prev) => [...prev, token])
    setReorderResult('pending')
  }

  const handleUnpickToken = (idx: number) => {
    if (reorderResult === 'correct') return
    const token = pickedTokens[idx]
    setPickedTokens((prev) => prev.filter((_, i) => i !== idx))
    setPoolTokens((prev) => [...prev, token])
    setReorderResult('pending')
  }

  const handleCheckReorder = () => {
    if (pickedTokens.length !== correctTokens.length) return
    const correct = pickedTokens.every((t, i) => t === correctTokens[i])
    setReorderResult(correct ? 'correct' : 'wrong')
    if (correct) {
      if (autoContinueTimer.current) window.clearTimeout(autoContinueTimer.current)
      autoContinueTimer.current = window.setTimeout(() => handleContinueReorder(), 900)
    }
  }

  const handleResetReorder = () => {
    if (!currentReorder) return
    setPoolTokens(shuffle(tokenize(currentReorder.en)))
    setPickedTokens([])
    setReorderResult('pending')
  }

  const handleContinueReorder = () => {
    if (reorderIndex < reorderPool.length - 1) {
      const nextIdx = reorderIndex + 1
      setReorderIndex(nextIdx)
      setPoolTokens(shuffle(tokenize(reorderPool[nextIdx].en)))
      setPickedTokens([])
      setReorderResult('pending')
    } else {
      setPhase('summary')
    }
  }

  const handleCompleteStage = async () => {
    if (!stage || !scenario || !words || words.length === 0) return
    const earnedStars = calcStars()
    await completeStageWithProgress(stage.id, earnedStars)
    setShowXpGain(true)
    setTimeout(() => onComplete(), 1000)
  }

  if (!stage || !scenario || !words) {
    return (
      <div className="page pb-32">
        <p className="text-gray-500">关卡加载中...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 进度条 */}
      {phase !== 'intro' && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">学习进度</span>
            <span className="text-xs font-semibold text-gray-500">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <motion.div
              className="h-full bg-gradient-to-r from-brand-400 to-brand-600"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ========== INTRO ========== */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="card"
          >
            <p className="mb-2 text-xs font-bold text-brand-600 uppercase">本关任务</p>
            <p className="mb-3 text-xl font-bold text-gray-900">{scenario.intro}</p>
            <p className="mb-5 text-sm text-gray-500">先学习 {words.length} 个词汇，再进入练习。</p>
            <button onClick={() => setPhase('learning')} className="w-full btn-primary py-3 rounded-xl">
              开始学习 →
            </button>
          </motion.div>
        )}

        {/* ========== LEARNING - 简化版 ========== */}
        {phase === 'learning' && currentWord && (
          <motion.div
            key={`learning-${learningIndex}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex-1 flex flex-col"
          >
            {/* 主卡片 */}
            <div className="card flex-1 flex flex-col">
              {/* 进度标识 */}
              <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-4">
                词汇 {learningIndex + 1}/{words.length}
              </p>

              {/* 核心信息区 */}
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {/* 单词 */}
                <h2 className="text-4xl font-black text-gray-900 mb-2" style={{ fontFamily: 'Poppins' }}>
                  {currentWord.word}
                </h2>

                {/* 音标 + 发音 */}
                <div className="flex items-center gap-2 mb-4">
                  {currentWord.phonetic && (
                    <span className="text-gray-500">{currentWord.phonetic}</span>
                  )}
                  <button
                    onClick={() => handlePlayWordAudio(currentWord)}
                    className="p-2 bg-brand-100 rounded-full text-brand-600 hover:bg-brand-200 transition"
                  >
                    <Volume2 size={18} />
                  </button>
                </div>

                {/* 词性 + 含义 */}
                <div className="bg-emerald-50 rounded-2xl px-5 py-3 mb-4">
                  <div className="flex items-center justify-center gap-2">
                    {currentWord.pos && (
                      <span className="px-2 py-0.5 bg-white text-emerald-700 text-xs font-bold rounded-full">
                        {currentWord.pos}
                      </span>
                    )}
                    <span className="text-lg font-bold text-gray-900">{currentWord.meaning}</span>
                  </div>
                </div>

                {/* 例句（目标词高亮） */}
                {learningExamples[0] && (
                  <div className="w-full bg-gray-50 rounded-xl p-3 mb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-left flex-1">
                        <p className="text-sm font-medium text-gray-800 leading-relaxed">
                          <HighlightedSentence sentence={learningExamples[0].en} word={currentWord.word} />
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{learningExamples[0].zh}</p>
                      </div>
                      <button
                        onClick={() => handlePlayExampleAudio(learningExamples[0].en)}
                        className="p-1.5 text-gray-400 hover:text-brand-600 transition shrink-0"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* 常用搭配（最多2个） */}
                {currentWord.phrases && currentWord.phrases.length > 0 && (
                  <div className="w-full mb-1">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2 text-left">常用搭配</p>
                    <div className="space-y-1.5">
                      {currentWord.phrases.slice(0, 2).map((phrase, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2 text-left">
                          <span className="text-sm font-semibold text-amber-900">{phrase.phrase}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-sm text-amber-700">{phrase.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 主动回忆按钮 */}
              <div className="mt-auto pt-4">
                <p className="text-xs text-center text-gray-400 mb-3">记住了吗？</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleNotSure}
                    className="flex-1 py-3 border-2 border-orange-200 bg-orange-50 rounded-xl font-semibold text-orange-700 hover:bg-orange-100 transition"
                  >
                    😅 还不熟
                  </button>
                  <button
                    onClick={handleContinueLearning}
                    className="flex-1 py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition"
                  >
                    {learningIndex === words.length - 1 ? '✅ 开始答题' : '✅ 记住了'}
                  </button>
                </div>
                <button
                  onClick={() => setShowWordDetail(true)}
                  className="w-full mt-2 py-1.5 text-xs text-gray-400 hover:text-brand-500 transition flex items-center justify-center gap-1"
                >
                  <BookOpen size={12} />
                  查看完整详情
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========== QUIZ ========== */}
        {phase === 'quiz' && currentStep && (
          <motion.div
            key={`quiz-${stepIndex}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4"
          >
            <div className="card">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-2">
                第 {stepIndex + 1}/{totalSteps} 题
                {currentStep.type === 'cloze' && <span className="ml-2 text-blue-500">· 填空</span>}
                {currentStep.type === 'context' && <span className="ml-2 text-purple-500">· 语境理解</span>}
              </p>

              {/* cloze：展示带空白的例句 + 中文翻译 */}
              {currentStep.type === 'cloze' && currentStep.sentence && (
                <div className="bg-blue-50 rounded-xl p-3 mb-3">
                  <p className="text-base font-medium text-gray-800 leading-relaxed">
                    {currentStep.sentence.split('___').map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <span className="inline-block px-3 bg-blue-200 text-blue-800 font-bold rounded mx-1 min-w-[3rem] text-center">
                            ___
                          </span>
                        )}
                      </span>
                    ))}
                  </p>
                  {currentStep.context && (
                    <p className="text-xs text-gray-500 mt-2">{currentStep.context}</p>
                  )}
                </div>
              )}

              {/* context：展示带高亮目标词的完整例句 */}
              {currentStep.type === 'context' && currentStep.sentence && (
                <div className="bg-purple-50 rounded-xl p-3 mb-3">
                  <p className="text-base font-medium text-gray-800 leading-relaxed">
                    <HighlightedSentence
                      sentence={currentStep.sentence}
                      word={currentStep.targetWord ?? ''}
                    />
                  </p>
                </div>
              )}

              <p className="text-lg font-semibold text-gray-800">{currentStep.prompt}</p>
              {currentStep.type === 'meaning' && currentStep.context && (
                <p className="text-xs text-gray-400 mt-1">{currentStep.context}</p>
              )}
              {currentStep.type === 'spell' && currentStep.context && (
                <p className="text-xs text-gray-400 mt-1">{currentStep.context}</p>
              )}
            </div>

            {/* 拼写输入框 */}
            {currentStep.type === 'spell' && (
              <div className="space-y-3">
                <input
                  autoFocus
                  type="text"
                  value={spellInput}
                  onChange={(e) => setSpellInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitSpell()}
                  disabled={selectedOption !== null}
                  placeholder="输入英文单词..."
                  className={`w-full px-4 py-3 rounded-xl border-2 text-lg font-semibold outline-none transition ${
                    selectedOption !== null
                      ? isStepCorrect
                        ? 'border-green-400 bg-green-50 text-green-900'
                        : 'border-red-400 bg-red-50 text-red-900'
                      : 'border-gray-200 focus:border-brand-400 bg-white'
                  }`}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => speak(currentStep.correctOption)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition"
                  >
                    <Volume2 size={16} /> 听发音
                  </button>
                  <button
                    onClick={handleSubmitSpell}
                    disabled={selectedOption !== null || spellInput.trim() === ''}
                    className="flex-1 btn-primary py-2.5 rounded-xl font-semibold disabled:opacity-50"
                  >
                    提交
                  </button>
                </div>
              </div>
            )}

            {/* 选择题选项 */}
            {currentStep.type !== 'spell' && (
              <div className="space-y-3">
                {currentStep.options.map((option) => (
                  <motion.button
                    key={option}
                    onClick={() => handleChooseOption(option)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    disabled={selectedOption !== null && isStepCorrect === true}
                    className={`w-full card text-left font-semibold transition border-2 ${
                      selectedOption === option
                        ? isStepCorrect
                          ? 'border-green-500 bg-green-50 text-green-900'
                          : 'border-red-500 bg-red-50 text-red-900'
                        : 'border-transparent hover:border-brand-300'
                    } ${selectedOption !== null && isStepCorrect === true ? 'opacity-60' : ''}`}
                  >
                    {option}
                  </motion.button>
                ))}
              </div>
            )}

            {selectedOption && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div
                  className={`p-3 rounded-xl text-sm font-semibold ${
                    isStepCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {isStepCorrect ? '✓ 回答正确！' : '✗ 再想想...'}
                </div>
                <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-xl">{feedbackText}</p>
                {!isStepCorrect && (
                  <p className="text-xs text-gray-600 p-3 bg-gray-50 rounded-xl">
                    正确答案：<span className="font-semibold">{currentStep.correctOption}</span>
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ========== REORDER ========== */}
        {phase === 'reorder' && currentReorder && (
          <motion.div
            key={`reorder-${reorderIndex}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4"
          >
            <div className="card">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-2">
                句子重组 {reorderIndex + 1}/{reorderPool.length}
              </p>
              <p className="text-xs text-gray-500 mb-1">把词块按正确顺序排好</p>
              <div className="flex items-start gap-2 mt-2">
                <p className="text-base font-semibold text-gray-800 flex-1">{currentReorder.zh}</p>
                <button
                  onClick={() => speak(currentReorder.en)}
                  className="p-2 hover:bg-brand-100 rounded-full transition"
                >
                  <Volume2 size={18} className="text-brand-500" />
                </button>
              </div>
            </div>

            <div
              className={`min-h-[64px] p-3 rounded-2xl border-2 border-dashed flex flex-wrap gap-2 ${
                reorderResult === 'correct'
                  ? 'border-green-400 bg-green-50'
                  : reorderResult === 'wrong'
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              {pickedTokens.length === 0 && (
                <p className="text-xs text-gray-400 self-center mx-auto">点击下方词块来组句</p>
              )}
              {pickedTokens.map((token, i) => (
                <motion.button
                  key={`${token}-${i}`}
                  onClick={() => handleUnpickToken(i)}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1.5 bg-white border border-brand-300 rounded-lg text-sm font-semibold text-gray-800 hover:bg-brand-50 transition"
                >
                  {token}
                </motion.button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {poolTokens.map((token, i) => (
                <motion.button
                  key={`${token}-${i}`}
                  onClick={() => handlePickToken(i)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={reorderResult === 'correct'}
                  className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm font-semibold hover:bg-brand-600 transition disabled:opacity-50"
                >
                  {token}
                </motion.button>
              ))}
            </div>

            {reorderResult !== 'pending' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`p-3 rounded-xl text-sm font-semibold ${
                  reorderResult === 'correct' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {reorderResult === 'correct' ? '✓ 完美！' : '✗ 顺序不对，再试试？'}
              </motion.div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleResetReorder}
                disabled={pickedTokens.length === 0 || reorderResult === 'correct'}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold disabled:opacity-50 hover:bg-gray-300 transition"
              >
                重置
              </button>
              <button
                onClick={handleCheckReorder}
                disabled={pickedTokens.length !== correctTokens.length || reorderResult === 'correct'}
                className="flex-1 btn-primary py-2 rounded-xl font-semibold disabled:opacity-50"
              >
                检查
              </button>
            </div>
          </motion.div>
        )}

        {/* ========== SUMMARY ========== */}
        {phase === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="card"
          >
            <p className="text-sm text-gray-500 mb-1">学习完成！</p>
            <p className="text-lg font-semibold text-gray-800 mb-4">你已完成这个舞台的全部内容</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3">
                <p className="text-xs text-gray-600 font-semibold">学习词汇</p>
                <p className="text-2xl font-bold text-blue-600">{words.length}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3">
                <p className="text-xs text-gray-600 font-semibold">星级评分</p>
                <p className="text-2xl font-bold text-amber-600">{'★'.repeat(calcStars()) || '-'}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-600 font-semibold mb-1">理解题成绩</p>
              <p className="text-lg font-bold text-gray-800">
                {totalSteps > 0 ? Math.round((correctCount / totalSteps) * 100) : 0}% ({correctCount}/{totalSteps})
              </p>
            </div>

            <button onClick={handleCompleteStage} className="w-full btn-primary py-3 rounded-xl font-semibold">
              完成关卡 +20 XP
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== 词汇详情弹窗 ========== */}
      <AnimatePresence>
        {showWordDetail && currentWord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowWordDetail(false)}
          >
            <div className="absolute inset-0 bg-black/40" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900">{currentWord.word}</h3>
                  <button
                    onClick={() => handlePlayWordAudio(currentWord)}
                    className="p-2 bg-brand-100 rounded-full text-brand-600"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
                <button onClick={() => setShowWordDetail(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* 内容区 - 可滚动 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 基本信息 */}
                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {currentWord.phonetic && (
                      <span className="text-gray-600">{currentWord.phonetic}</span>
                    )}
                    {currentWord.pos && (
                      <span className="px-2 py-0.5 bg-white text-emerald-700 text-xs font-bold rounded-full">
                        {currentWord.pos}
                      </span>
                    )}
                  </div>
                  {currentWord.senses && currentWord.senses.length > 0 ? (
                    <div className="space-y-3">
                      {currentWord.senses.map((sense: NonNullable<Word['senses']>[number], idx: number) => (
                        <div key={`${sense.meaning}-${idx}`} className="rounded-lg bg-white/70 p-3">
                          <p
                            className={sense.important ? 'text-lg font-bold text-gray-900' : 'text-sm font-medium text-gray-700'}
                          >
                            {sense.meaning}
                          </p>
                          <div className="mt-2 border-l-2 border-emerald-200 pl-3">
                            <p className="text-sm text-gray-800">{sense.example.en}</p>
                            <p className="text-xs text-gray-500 mt-1">{sense.example.zh}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-gray-900">{currentWord.meaning}</p>
                  )}
                </div>

                {/* 例句：仅当没有 senses 时才单独展示，避免重复 */}
                {(!currentWord.senses || currentWord.senses.length === 0) && learningExamples.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">例句</p>
                    <div className="space-y-2">
                      {learningExamples.map((ex, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 leading-relaxed">
                                <HighlightedSentence sentence={ex.en} word={currentWord.word} />
                              </p>
                              <p className="text-xs text-gray-500 mt-1">{ex.zh}</p>
                            </div>
                            <button
                              onClick={() => handlePlayExampleAudio(ex.en)}
                              className="p-1.5 text-gray-400 hover:text-brand-600 transition shrink-0"
                            >
                              <Volume2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 词组搭配 */}
                {currentWord.phrases && currentWord.phrases.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">常用搭配</p>
                    <div className="space-y-2">
                      {currentWord.phrases.map((phrase, idx) => (
                        <div key={idx} className="bg-amber-50 rounded-xl p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-amber-900">{phrase.phrase}</p>
                              <p className="text-xs text-amber-700 mt-0.5">{phrase.meaning}</p>
                              {phrase.example && (
                                <p className="text-xs text-gray-500 mt-1 italic">{phrase.example.en}</p>
                              )}
                            </div>
                            {phrase.example && (
                              <button
                                onClick={() => handlePlayExampleAudio(phrase.example!.en)}
                                className="p-1.5 text-amber-400 hover:text-amber-600 transition shrink-0"
                              >
                                <Volume2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 记忆提示 */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">记忆提示</p>
                  <div className="bg-purple-50 rounded-xl p-3">
                    <p className="text-sm text-purple-800">{memoryHint}</p>
                  </div>
                </div>

                {/* 相关词 */}
                {relatedWords.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">相关词</p>
                    <div className="flex flex-wrap gap-2">
                      {relatedWords.map((w, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 底部按钮 */}
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={() => setShowWordDetail(false)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
                >
                  返回学习
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP 动画 */}
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
