import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Volume2, MessageCircle, User, RotateCcw, Sparkles } from 'lucide-react'
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

// 对话模板生成器
interface DialogueTemplate {
  scenario: string
  icon: string
  lines: Array<{
    speaker: 'A' | 'B'
    template: string // 使用 {word} 作为填空占位符
    wordHint: string // 提示用什么类型的词
  }>
}

const DIALOGUE_TEMPLATES: Record<string, DialogueTemplate[]> = {
  travel: [
    {
      scenario: '机场值机',
      icon: '✈️',
      lines: [
        { speaker: 'A', template: "Hi, I'd like to check in for my flight.", wordHint: 'greeting' },
        { speaker: 'B', template: "Sure! May I see your {word} please?", wordHint: 'document' },
        { speaker: 'A', template: "Here you go. I have one {word} to check.", wordHint: 'luggage' },
        { speaker: 'B', template: "Perfect. Here's your {word}. Gate 15.", wordHint: 'ticket' },
        { speaker: 'A', template: "Thank you! Where's the {word} check?", wordHint: 'security' },
        { speaker: 'B', template: "Go straight, then turn left at the {word}.", wordHint: 'terminal' },
      ]
    },
    {
      scenario: '酒店入住',
      icon: '🏨',
      lines: [
        { speaker: 'A', template: "Good evening, I have a {word}.", wordHint: 'booking' },
        { speaker: 'B', template: "Welcome! May I have your {word}?", wordHint: 'document' },
        { speaker: 'A', template: "Sure. I booked a {word} for two nights.", wordHint: 'room' },
        { speaker: 'B', template: "Great! Here's your {word}. Room 302.", wordHint: 'key' },
        { speaker: 'A', template: "Is {word} included?", wordHint: 'meal' },
        { speaker: 'B', template: "Yes, from 7 to 10 AM in the {word}.", wordHint: 'hall' },
      ]
    }
  ],
  drama: [
    {
      scenario: '老友相遇',
      icon: '👋',
      lines: [
        { speaker: 'A', template: "{word}! Is that you?", wordHint: 'greeting' },
        { speaker: 'B', template: "Oh my! {word}! It's been ages!", wordHint: 'surprise' },
        { speaker: 'A', template: "{word}? What have you been up to?", wordHint: 'question' },
        { speaker: 'B', template: "I've been {word}! Got a new job.", wordHint: 'feeling' },
        { speaker: 'A', template: "That's {word}! We should catch up.", wordHint: 'positive' },
        { speaker: 'B', template: "{word}! Let's grab coffee sometime.", wordHint: 'agreement' },
      ]
    },
    {
      scenario: '追剧讨论',
      icon: '📺',
      lines: [
        { speaker: 'A', template: "Did you watch the new episode? It was {word}!", wordHint: 'amazing' },
        { speaker: 'B', template: "I know! That plot twist was so {word}.", wordHint: 'unexpected' },
        { speaker: 'A', template: "The ending made me feel so {word}.", wordHint: 'emotion' },
        { speaker: 'B', template: "Same! I was {word} when the hero survived.", wordHint: 'relieved' },
        { speaker: 'A', template: "But that villain is so {word}!", wordHint: 'negative' },
        { speaker: 'B', template: "Totally! I can't wait for next week.", wordHint: 'excited' },
      ]
    }
  ],
  exam: [
    {
      scenario: '课堂讨论',
      icon: '📚',
      lines: [
        { speaker: 'A', template: "I need to {word} more vocabulary.", wordHint: 'learn' },
        { speaker: 'B', template: "Have you tried to {word} with flashcards?", wordHint: 'study' },
        { speaker: 'A', template: "Yes, but I can't {word} them all.", wordHint: 'remember' },
        { speaker: 'B', template: "Try to {word} them in sentences.", wordHint: 'use' },
        { speaker: 'A', template: "Good idea! I'll {word} that method.", wordHint: 'try' },
        { speaker: 'B', template: "You'll {word} great results!", wordHint: 'achieve' },
      ]
    }
  ]
}

export default function DialoguePracticePage() {
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

  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [completedLines, setCompletedLines] = useState<string[]>([])
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [dialogueIndex, setDialogueIndex] = useState(0)

  // 选择对话模板
  const templates = DIALOGUE_TEMPLATES[trackId ?? 'travel'] || DIALOGUE_TEMPLATES.travel
  const currentTemplate = templates[dialogueIndex % templates.length]

  // 为每行分配一个已学单词
  const lineWordAssignments = useMemo(() => {
    if (!learnedWords || learnedWords.length === 0) return []
    const shuffled = shuffle(learnedWords)
    return currentTemplate.lines.map((_, idx) => shuffled[idx % shuffled.length])
  }, [learnedWords, currentTemplate])

  const currentLine = currentTemplate.lines[currentLineIndex]
  const currentWord = lineWordAssignments[currentLineIndex]

  // 生成当前行的选项
  const options = useMemo(() => {
    if (!currentWord || !allWords || allWords.length < 4) return []
    const distractors = shuffle(
      allWords.filter(w => w.id !== currentWord.id).map(w => w.word)
    ).slice(0, 3)
    return shuffle([currentWord.word, ...distractors])
  }, [currentWord, allWords])

  // 填入单词后的完整句子
  const getFilledLine = (template: string, word: string) => {
    return template.replace('{word}', word)
  }

  const handleSelectWord = (word: string) => {
    if (selectedWord !== null) return

    const correct = word === currentWord?.word
    setSelectedWord(word)
    setIsCorrect(correct)

    if (correct) {
      setScore(prev => prev + 10)
      speak(getFilledLine(currentLine.template, word))
    }

    // 添加到已完成对话
    setTimeout(() => {
      const filledLine = getFilledLine(currentLine.template, correct ? word : currentWord?.word ?? '')
      setCompletedLines(prev => [...prev, `${currentLine.speaker}: ${filledLine}`])

      if (currentLineIndex < currentTemplate.lines.length - 1) {
        setCurrentLineIndex(prev => prev + 1)
        setSelectedWord(null)
        setIsCorrect(null)
      } else {
        setIsFinished(true)
      }
    }, correct ? 1000 : 1500)
  }

  const handleRestart = () => {
    setCurrentLineIndex(0)
    setSelectedWord(null)
    setIsCorrect(null)
    setCompletedLines([])
    setScore(0)
    setIsFinished(false)
    setDialogueIndex(prev => prev + 1)
  }

  const handlePlayLine = (text: string) => {
    speak(text.replace(/^[AB]: /, ''))
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
          <p className="text-4xl mb-4">💬</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">还没有学过单词</h2>
          <p className="text-gray-600 mb-6">先去完成关卡学习一些单词，再来对话练习吧！</p>
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
    return (
      <div className="page pb-32">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-600">
          <ArrowLeft size={20} />
          返回
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles size={32} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">对话完成！</h2>
            <p className="text-gray-600">得分：{score} 分</p>
          </div>

          {/* 完整对话回顾 */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 max-h-64 overflow-y-auto">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">
              {currentTemplate.icon} {currentTemplate.scenario}
            </p>
            <div className="space-y-2">
              {completedLines.map((line, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex items-start gap-2 ${
                    line.startsWith('A:') ? '' : 'flex-row-reverse'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    line.startsWith('A:') ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    {line.startsWith('A:') ? 'A' : 'B'}
                  </div>
                  <div
                    className={`flex-1 p-2 rounded-xl text-sm ${
                      line.startsWith('A:') ? 'bg-blue-100 text-blue-900' : 'bg-green-100 text-green-900'
                    }`}
                  >
                    <button
                      onClick={() => handlePlayLine(line)}
                      className="float-right p-1 opacity-60 hover:opacity-100"
                    >
                      <Volume2 size={14} />
                    </button>
                    {line.replace(/^[AB]: /, '')}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRestart}
              className="flex-1 py-3 border-2 border-purple-300 bg-purple-50 rounded-xl font-semibold text-purple-700 flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              换个对话
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

  return (
    <div className="page pb-32">
      {/* 顶部 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-purple-500" />
          <span className="font-semibold text-gray-700">{currentTemplate.scenario}</span>
        </div>
        <span className="text-sm font-bold text-purple-600">{score} 分</span>
      </div>

      {/* 进度 */}
      <div className="h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-400 to-pink-500"
          animate={{ width: `${((currentLineIndex + 1) / currentTemplate.lines.length) * 100}%` }}
        />
      </div>

      {/* 已完成的对话 */}
      <div className="space-y-3 mb-6 max-h-48 overflow-y-auto">
        {completedLines.map((line, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-2 ${
              line.startsWith('A:') ? '' : 'flex-row-reverse'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
              line.startsWith('A:') ? 'bg-blue-500' : 'bg-green-500'
            }`}>
              {line.startsWith('A:') ? 'A' : 'B'}
            </div>
            <div
              className={`p-3 rounded-2xl text-sm max-w-[80%] ${
                line.startsWith('A:')
                  ? 'bg-blue-100 text-blue-900 rounded-tl-sm'
                  : 'bg-green-100 text-green-900 rounded-tr-sm'
              }`}
            >
              {line.replace(/^[AB]: /, '')}
            </div>
          </motion.div>
        ))}
      </div>

      {/* 当前需要填空的行 */}
      <motion.div
        key={currentLineIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
            currentLine.speaker === 'A' ? 'bg-blue-500' : 'bg-green-500'
          }`}>
            {currentLine.speaker}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">选择正确的词完成对话</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-lg">
          {currentLine.template.split('{word}').map((part, idx, arr) => (
            <span key={idx}>
              {part}
              {idx < arr.length - 1 && (
                <span className={`inline-block min-w-[80px] px-2 py-1 mx-1 rounded-lg text-center font-bold ${
                  selectedWord === null
                    ? 'bg-purple-200 text-purple-400 border-2 border-dashed border-purple-300'
                    : isCorrect
                      ? 'bg-green-200 text-green-800'
                      : 'bg-red-200 text-red-800'
                }`}>
                  {selectedWord ?? '___'}
                </span>
              )}
            </span>
          ))}
        </div>

        {/* 单词提示 */}
        {currentWord && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <span>提示：{currentWord.meaning}</span>
            <button onClick={() => speak(currentWord.word)} className="p-1 text-brand-600">
              <Volume2 size={14} />
            </button>
          </div>
        )}
      </motion.div>

      {/* 选项 */}
      {selectedWord === null && (
        <div className="grid grid-cols-2 gap-3">
          {options.map((word, idx) => (
            <motion.button
              key={idx}
              onClick={() => handleSelectWord(word)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="p-4 bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-800 hover:border-purple-300 hover:bg-purple-50 transition"
            >
              {word}
            </motion.button>
          ))}
        </div>
      )}

      {/* 反馈 */}
      <AnimatePresence>
        {selectedWord !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-xl text-center font-semibold ${
              isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isCorrect ? '✓ 完美！' : `✗ 正确答案是：${currentWord?.word}`}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
