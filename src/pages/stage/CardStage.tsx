import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2 } from 'lucide-react'
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
  const [combo, setCombo] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isStepCorrect, setIsStepCorrect] = useState<boolean | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [showXpGain, setShowXpGain] = useState(false)
  const [hasFailedCurrentStep, setHasFailedCurrentStep] = useState(false)
  const [reorderIndex, setReorderIndex] = useState(0)
  const [pickedTokens, setPickedTokens] = useState<string[]>([])
  const [poolTokens, setPoolTokens] = useState<string[]>([])
  const [reorderResult, setReorderResult] = useState<'pending' | 'correct' | 'wrong'>('pending')
  const autoContinueTimer = useRef<number | null>(null)

  const scenario = useMemo(() => {
    if (!stage || !words || words.length === 0) return null
    return getStageScenario(stage.id) ?? buildFallbackScenario(stage.id, stage.title, words)
  }, [stage, words])

  const totalSteps = scenario?.steps.length ?? 0
  const currentStep = scenario?.steps[stepIndex]
  const currentWord = words?.[learningIndex]

  // 句子重组池：从词汇例句里挑短句（≤10 词），最多 2 句
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
  const correctTokens = useMemo(
    () => (currentReorder ? tokenize(currentReorder.en) : []),
    [currentReorder]
  )

  const hasReorder = reorderPool.length > 0

  const progressPercent = useMemo(() => {
    if (phase === 'intro') return 0
    // 学习段占 40%，quiz 占 40%，重组占 20%（如有）
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
      if (autoContinueTimer.current) {
        window.clearTimeout(autoContinueTimer.current)
      }
    }
  }, [])

  const handlePlayWordAudio = (word: Word) => {
    speak(word.word)
  }

  const handleContinueLearning = () => {
    if (!words) return
    if (learningIndex < words.length - 1) {
      setLearningIndex((prev) => prev + 1)
    } else {
      setPhase('quiz')
      setStepIndex(0)
    }
  }

  const findWordIdByText = (text: string): string => {
    if (!words) return ''
    return (words as Word[]).find((w) => w.word === text)?.id ?? ''
  }

  const recordWrongAnswer = async (wrongOption: string) => {
    if (!stage || !currentStep) return
    const wordId = findWordIdByText(currentStep.correctOption)
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
    const wordId = findWordIdByText(currentStep.correctOption)
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
      const nextCombo = combo + 1
      setCombo(nextCombo)
      setCorrectCount((prev) => prev + 1)

      // 第一次就答对：mastery +1；否则只是修复，不奖励
      if (!hasFailedCurrentStep) {
        adjustWordMastery(1)
      } else {
        markWrongAnswerResolved()
      }

      if (autoContinueTimer.current) {
        window.clearTimeout(autoContinueTimer.current)
      }
      autoContinueTimer.current = window.setTimeout(() => {
        handleContinueQuiz()
      }, 700)
    } else {
      setCombo(0)
      // 第一次错才扣 mastery 并记录错题
      if (!hasFailedCurrentStep) {
        adjustWordMastery(-1)
        setHasFailedCurrentStep(true)
      }
      recordWrongAnswer(option)

      if (autoContinueTimer.current) {
        window.clearTimeout(autoContinueTimer.current)
      }
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
      if (autoContinueTimer.current) {
        window.clearTimeout(autoContinueTimer.current)
      }
      autoContinueTimer.current = window.setTimeout(() => {
        handleContinueReorder()
      }, 900)
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

    setTimeout(() => {
      onComplete()
    }, 1000)
  }

  if (!stage || !scenario || !words) {
    return (
      <div className="page pb-32">
        <p className="text-gray-500">关卡加载中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="mb-4 card border border-white/80 bg-white/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">学习进度</span>
          <span className="text-xs text-gray-500">{progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-600"
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
            className="card mb-6 border border-brand-100"
          >
            <p className="text-sm text-gray-500 mb-2">场景导入</p>
            <p className="text-lg font-semibold text-gray-800 mb-3">{scenario.intro}</p>
            <p className="text-xs text-gray-600 mb-4">
              💡 接下来，我们先学习这个舞台的词汇，然后再进行理解练习
            </p>
            <button onClick={() => setPhase('learning')} className="w-full btn-primary py-3 rounded-2xl">
              开始学习词汇 →
            </button>
          </motion.div>
        )}

        {phase === 'learning' && currentWord && (
          <motion.div
            key={`learning-${learningIndex}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="card mb-6 border border-emerald-100"
          >
            <div className="text-center mb-6">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-4">
                词汇学习 {learningIndex + 1}/{words.length}
              </p>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 mb-6 border border-emerald-100">
                <p className="text-5xl font-bold text-brand-700 mb-3" style={{ fontFamily: 'Poppins' }}>
                  {currentWord.word}
                </p>
                {currentWord.phonetic && (
                  <p className="text-lg text-gray-600 mb-4">{currentWord.phonetic}</p>
                )}
                <button
                  onClick={() => handlePlayWordAudio(currentWord)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full font-semibold hover:bg-emerald-600 transition"
                >
                  <Volume2 size={18} />
                  听发音
                </button>
              </div>

              <div className="space-y-3 text-left">
                {currentWord.pos && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 font-semibold mb-1">词性</p>
                    <p className="text-base font-semibold text-gray-800">{currentWord.pos}</p>
                  </div>
                )}

                <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-400">
                  <p className="text-xs text-gray-500 font-semibold mb-1">中文释义</p>
                  <p className="text-base font-semibold text-gray-800">{currentWord.meaning}</p>
                </div>

                {currentWord.examples && currentWord.examples.length > 0 && (
                  <div className="bg-amber-50 rounded-xl p-4 border-l-4 border-amber-400">
                    <p className="text-xs text-gray-500 font-semibold mb-3">例句</p>
                    <div className="space-y-2">
                      {currentWord.examples.map((ex: { en: string; zh: string }, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <p className="text-sm text-gray-700 italic">{ex.en}</p>
                          <p className="text-xs text-gray-600">{ex.zh}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentWord.roots && (
                  <div className="bg-purple-50 rounded-xl p-4 border-l-4 border-purple-400">
                    <p className="text-xs text-gray-500 font-semibold mb-2">📜 词根</p>
                    <p className="text-sm text-gray-800">{currentWord.roots}</p>
                  </div>
                )}

                {currentWord.family && currentWord.family.length > 0 && (
                  <div className="bg-indigo-50 rounded-xl p-4 border-l-4 border-indigo-400">
                    <p className="text-xs text-gray-500 font-semibold mb-2">🌳 同族词</p>
                    <div className="flex flex-wrap gap-2">
                      {currentWord.family.map((w: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-white rounded-md text-xs font-semibold text-indigo-700 border border-indigo-200"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleContinueLearning} className="w-full py-3 rounded-2xl font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition">
              {learningIndex === words.length - 1
                ? '全部学完，开始答题 →'
                : `下一个词汇 (${learningIndex + 2}/${words.length})`}
            </button>
          </motion.div>
        )}

        {phase === 'quiz' && currentStep && (
          <motion.div
            key={`quiz-${stepIndex}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4"
          >
            <div className="card">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-2">第 {stepIndex + 1}/{totalSteps} 题</p>
              <p className="text-xs text-gray-500 mb-2">{currentStep.context}</p>
              <p className="text-lg font-semibold text-gray-800">{currentStep.prompt}</p>
            </div>

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
                      : 'border-transparent hover:border-emerald-300'
                  } ${selectedOption !== null && isStepCorrect === true ? 'opacity-60' : ''}`}
                >
                  {option}
                </motion.button>
              ))}
            </div>

            {selectedOption && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
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
              <p className="text-xs text-gray-500 mb-1">把下方词块按正确顺序排好</p>
              <div className="flex items-start gap-2 mt-2">
                <p className="text-base font-semibold text-gray-800 flex-1">{currentReorder.zh}</p>
                <button
                  onClick={() => speak(currentReorder.en)}
                  className="p-2 hover:bg-brand-100 rounded-full transition flex-shrink-0"
                >
                  <Volume2 size={18} className="text-brand-500" />
                </button>
              </div>
            </div>

            {/* 已选区域 */}
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
                <p className="text-xs text-gray-400 self-center mx-auto">从下方点击词块来组句</p>
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

            {/* 候选词块 */}
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

            {/* 反馈与操作 */}
            {reorderResult === 'wrong' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-xl bg-red-100 text-red-800 text-sm font-semibold"
              >
                ✗ 顺序不对，再看看汉语意思试试？
              </motion.div>
            )}
            {reorderResult === 'correct' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-xl bg-green-100 text-green-800 text-sm font-semibold"
              >
                ✓ 完美！下一句...
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

        {phase === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="card mb-6"
          >
            <p className="text-sm text-gray-500 mb-1">学习完成！</p>
            <p className="text-lg font-semibold text-gray-800 mb-4">很棒！你成功学习了这个舞台的全部内容。</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3">
                <p className="text-xs text-gray-600 font-semibold">学习词汇</p>
                <p className="text-2xl font-bold text-blue-600">{words.length}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3">
                <p className="text-xs text-gray-600 font-semibold">星级评分</p>
                <p className="text-2xl font-bold text-amber-600">{'★'.repeat(calcStars())}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-600 font-semibold mb-1">理解题成绩</p>
              <p className="text-lg font-bold text-gray-800">
                {totalSteps > 0 ? Math.round((correctCount / totalSteps) * 100) : 0}% ({correctCount}/{totalSteps})
              </p>
            </div>

            <button onClick={handleCompleteStage} className="w-full btn-primary py-3 rounded-2xl font-semibold">
              完成关卡并领取 +20 XP
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
