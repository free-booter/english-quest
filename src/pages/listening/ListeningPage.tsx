import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, Volume2, RotateCcw } from 'lucide-react'
import { db } from '../../db/db'
import { speak } from '../../tts/tts'
import { Word } from '../../types'

type ListeningMode = 'choose' | 'spell'

interface ChooseQuestion {
  word: Word
  options: Word[]
}


function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  copy.sort(() => Math.random() - 0.5)
  return copy.slice(0, n)
}

function generateChooseQuestion(words: Word[]): ChooseQuestion | null {
  if (words.length < 4) return null
  const correct = words[Math.floor(Math.random() * words.length)]
  const distractors = pickRandom(
    words.filter((w) => w.id !== correct.id && w.meaning !== correct.meaning),
    3
  )
  const options = pickRandom([correct, ...distractors], 4)
  return { word: correct, options }
}

function pickSpellWord(words: Word[]): Word | null {
  // 拼写模式过滤：只用单词（不含空格的纯单词），≤12 字符
  const candidates = words.filter((w) => !w.word.includes(' ') && w.word.length <= 12)
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}


export default function ListeningPage() {
  const allWords = useLiveQuery(() => db.words.toArray())
  const wrongAnswers = useLiveQuery(() => db.wrongAnswers.filter((w) => !w.resolved).toArray())

  const [mode, setMode] = useState<ListeningMode>('choose')
  const [speed, setSpeed] = useState(1)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)

  // 优先级词池：错题词 + mastery<3 的词，回退到全部
  const wordPool = useMemo(() => {
    if (!allWords) return []
    const wrongWordIds = new Set(wrongAnswers?.map((w) => w.wordId).filter(Boolean) ?? [])
    const priority = allWords.filter((w) => wrongWordIds.has(w.id) || w.mastery < 3)
    return priority.length >= 4 ? priority : allWords
  }, [allWords, wrongAnswers])

  // 选词模式状态
  const [chooseQuestion, setChooseQuestion] = useState<ChooseQuestion | null>(null)
  const [chooseSelectedId, setChooseSelectedId] = useState<string | null>(null)
  const [chooseIsCorrect, setChooseIsCorrect] = useState<boolean | null>(null)

  // 拼写模式状态
  const [spellWord, setSpellWord] = useState<Word | null>(null)
  const [spellInput, setSpellInput] = useState('')
  const [spellResult, setSpellResult] = useState<'pending' | 'correct' | 'wrong'>('pending')

  // 初始化和模式切换
  useEffect(() => {
    if (wordPool.length === 0) return
    if (mode === 'choose') {
      setChooseQuestion(generateChooseQuestion(wordPool))
      setChooseSelectedId(null)
      setChooseIsCorrect(null)
    } else if (mode === 'spell') {
      setSpellWord(pickSpellWord(wordPool))
      setSpellInput('')
      setSpellResult('pending')
    }
  }, [mode, wordPool])

  const handleChoose = (option: Word) => {
    if (!chooseQuestion || chooseSelectedId) return
    setChooseSelectedId(option.id)
    const correct = option.id === chooseQuestion.word.id
    setChooseIsCorrect(correct)
    setTotal((t) => t + 1)
    if (correct) setScore((s) => s + 1)
  }

  const handleNextChoose = () => {
    setChooseQuestion(generateChooseQuestion(wordPool))
    setChooseSelectedId(null)
    setChooseIsCorrect(null)
  }

  const handlePlayCurrentWord = () => {
    if (mode === 'choose' && chooseQuestion) {
      speak(chooseQuestion.word.word, { rate: speed })
    } else if (mode === 'spell' && spellWord) {
      speak(spellWord.word, { rate: speed })
    }
  }

  const handleSubmitSpell = () => {
    if (!spellWord || spellResult === 'correct') return
    const correct = spellInput.trim().toLowerCase() === spellWord.word.toLowerCase()
    setSpellResult(correct ? 'correct' : 'wrong')
    setTotal((t) => t + 1)
    if (correct) setScore((s) => s + 1)
  }

  const handleNextSpell = () => {
    setSpellWord(pickSpellWord(wordPool))
    setSpellInput('')
    setSpellResult('pending')
  }

  const handleSpellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (spellResult === 'correct') {
        handleNextSpell()
      } else {
        handleSubmitSpell()
      }
    }
  }

  if (!allWords || allWords.length === 0) {
    return (
      <div className="page">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-brand-700" style={{ fontFamily: 'Poppins' }}>
            听力练习
          </h1>
          <p className="text-sm text-gray-400 mt-1">训练你的耳朵</p>
        </div>

        <div className="card-accent text-center py-16 flex flex-col items-center justify-center">
          <Headphones size={56} className="text-indigo-400 mb-4 opacity-50" />
          <p className="text-gray-600 text-lg font-semibold">还没有学习的词语</p>
          <p className="text-sm text-gray-400 mt-2">先去闯关学习新词吧 📚</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page pb-32">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
          🎧 听力练习
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {total > 0 ? `${score}/${total} · 正确率 ${Math.round((score / total) * 100)}%` : '准备好你的耳朵了吗？'}
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 rounded-2xl">
        <button
          onClick={() => setMode('choose')}
          className={`py-2 rounded-xl font-semibold transition ${
            mode === 'choose' ? 'bg-white text-brand-600 shadow' : 'text-gray-500'
          }`}
        >
          🎯 听音选义
        </button>
        <button
          onClick={() => setMode('spell')}
          className={`py-2 rounded-xl font-semibold transition ${
            mode === 'spell' ? 'bg-white text-brand-600 shadow' : 'text-gray-500'
          }`}
        >
          ✍️ 听音拼写
        </button>
      </div>

      {/* Speed Control */}
      <div className="flex gap-2 mb-6">
        <span className="text-xs text-gray-500 self-center mr-1">语速</span>
        {[0.75, 1, 1.25].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`flex-1 py-1.5 text-sm rounded-lg font-semibold transition ${
              speed === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Play Button */}
      <div className="flex justify-center mb-8">
        <motion.button
          onClick={handlePlayCurrentWord}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white shadow-lg"
        >
          <Volume2 size={48} />
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {/* 听音选义 */}
        {mode === 'choose' && chooseQuestion && (
          <motion.div
            key={`choose-${chooseQuestion.word.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="space-y-3 mb-6">
              {chooseQuestion.options.map((option) => {
                const isSelected = chooseSelectedId === option.id
                const isAnswer = isSelected && chooseIsCorrect
                const isWrong = isSelected && chooseIsCorrect === false
                return (
                  <motion.button
                    key={option.id}
                    onClick={() => handleChoose(option)}
                    disabled={chooseSelectedId !== null}
                    whileHover={chooseSelectedId === null ? { scale: 1.01 } : {}}
                    whileTap={chooseSelectedId === null ? { scale: 0.99 } : {}}
                    className={`w-full p-4 rounded-2xl font-semibold transition text-left ${
                      isAnswer
                        ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                        : isWrong
                        ? 'bg-red-100 text-red-700 ring-2 ring-red-500'
                        : chooseSelectedId
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-base">{option.meaning}</div>
                  </motion.button>
                )
              })}
            </div>

            {chooseIsCorrect !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-center mb-4 py-3 rounded-xl ${
                  chooseIsCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                <p className="font-semibold mb-1">
                  {chooseIsCorrect ? '✨ 正确！' : '❌ 不对'}
                </p>
                <p className="text-sm">
                  {chooseQuestion.word.word} · {chooseQuestion.word.meaning}
                </p>
              </motion.div>
            )}

            {chooseSelectedId && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleNextChoose}
                className="w-full btn-primary py-3 rounded-2xl font-semibold"
              >
                下一题 →
              </motion.button>
            )}
          </motion.div>
        )}

        {/* 听音拼写 */}
        {mode === 'spell' && spellWord && (
          <motion.div
            key={`spell-${spellWord.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="card mb-4">
              <p className="text-xs text-gray-500 mb-2">听到单词后输入英文拼写</p>
              <p className="text-sm font-semibold text-gray-700">中文意思：{spellWord.meaning}</p>
            </div>

            <input
              type="text"
              value={spellInput}
              onChange={(e) => setSpellInput(e.target.value)}
              onKeyDown={handleSpellKeyDown}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="输入拼写..."
              disabled={spellResult === 'correct'}
              className={`w-full px-4 py-3 rounded-2xl border-2 text-lg font-semibold text-center transition ${
                spellResult === 'correct'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : spellResult === 'wrong'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 focus:border-brand-400 focus:outline-none'
              }`}
            />

            {spellResult === 'wrong' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 bg-red-50 rounded-xl text-center"
              >
                <p className="text-sm text-red-700 font-semibold mb-1">✗ 拼写不对</p>
                <p className="text-xs text-gray-600">再听一遍，仔细想想</p>
              </motion.div>
            )}

            {spellResult === 'correct' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 bg-green-50 rounded-xl text-center"
              >
                <p className="text-sm text-green-700 font-semibold">✓ 拼写正确！</p>
                <p className="text-xs text-gray-600 mt-1">{spellWord.phonetic}</p>
              </motion.div>
            )}

            <div className="flex gap-2 mt-4">
              {spellResult === 'wrong' && (
                <button
                  onClick={() => {
                    setSpellInput('')
                    setSpellResult('pending')
                  }}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-300 transition"
                >
                  <RotateCcw size={16} />
                  再试一次
                </button>
              )}
              {spellResult === 'pending' && (
                <button
                  onClick={handleSubmitSpell}
                  disabled={spellInput.trim().length === 0}
                  className="flex-1 btn-primary py-3 rounded-2xl font-semibold disabled:opacity-50"
                >
                  检查
                </button>
              )}
              {spellResult === 'correct' && (
                <button
                  onClick={handleNextSpell}
                  className="flex-1 btn-primary py-3 rounded-2xl font-semibold"
                >
                  下一题 →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
