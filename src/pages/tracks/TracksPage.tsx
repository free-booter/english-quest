import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, BookOpen, Target, Star, Flame, ChevronDown, Zap, Clock, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../../db/db'
import { calcConsecutiveCheckInDays } from '../../utils/stats'

const HIDDEN_TRACKS = ['exam']

export default function TracksPage() {
  const navigate = useNavigate()
  const [showSwitchSheet, setShowSwitchSheet] = useState(false)

  const tracks = useLiveQuery(() => db.tracks.toArray())
  const settings = useLiveQuery(() => db.userSettings.toCollection().first())
  const progress = useLiveQuery(() => db.trackProgress.toArray())
  const stages = useLiveQuery(() => db.stages.toArray())
  const chapters = useLiveQuery(() => db.chapters.toArray())
  const words = useLiveQuery(() => db.words.toArray())
  const checkIns = useLiveQuery(() => db.checkIns.toArray())

  if (!tracks || !settings || !progress || !stages || !chapters || !words || !checkIns) return null

  const streak = calcConsecutiveCheckInDays(checkIns)
  const visibleTracks = tracks.filter((t) => !HIDDEN_TRACKS.includes(t.id))
  const activeTrack = tracks.find((t) => t.id === settings.primaryTrack) ?? visibleTracks[0]
  const otherTracks = visibleTracks.filter((t) => t.id !== activeTrack?.id)

  if (!activeTrack) return null

  const trackStages = stages.filter((s) => s.trackId === activeTrack.id)
  const completedStages = trackStages.filter((s) => s.status === 'completed')
  const totalStages = trackStages.length
  const completionPercent = totalStages > 0 ? Math.round((completedStages.length / totalStages) * 100) : 0

  const nextStage = trackStages
    .filter((s) => s.status !== 'completed')
    .sort((a, b) => a.index - b.index)[0]
  const nextChapter = nextStage ? chapters.find((c) => c.id === nextStage.chapterId) : null
  const previewWords = nextStage
    ? words.filter((w) => nextStage.wordIds.includes(w.id)).slice(0, 3)
    : []

  const trackWords = words.filter((w) => w.trackTags.includes(activeTrack.id))
  const learnedWords = trackWords.filter((w) => w.mastery >= 1).length
  const trackProgress = progress.find((p) => p.trackId === activeTrack.id)
  const completedChapters = chapters.filter(
    (c) => c.trackId === activeTrack.id && c.status === 'completed'
  ).length
  const totalChapters = chapters.filter((c) => c.trackId === activeTrack.id).length

  const colorMap: Record<string, { accent: string; progress: string; bg: string; border: string; ring: string }> = {
    travel: {
      accent: 'text-blue-600',
      progress: 'bg-blue-500',
      bg: 'from-blue-50 to-cyan-50',
      border: 'border-blue-200',
      ring: 'ring-blue-400',
    },
    drama: {
      accent: 'text-purple-600',
      progress: 'bg-purple-500',
      bg: 'from-purple-50 to-pink-50',
      border: 'border-purple-200',
      ring: 'ring-purple-400',
    },
  }
  const colors = colorMap[activeTrack.id] ?? {
    accent: 'text-brand-600',
    progress: 'bg-brand-500',
    bg: 'from-brand-50 to-brand-100',
    border: 'border-brand-200',
    ring: 'ring-brand-400',
  }

  const switchTheme = async (trackId: string) => {
    const keys = (await db.userSettings.toCollection().primaryKeys()) as number[]
    if (keys.length > 0) {
      const current = settings.selectedTracks.includes(trackId)
        ? settings.selectedTracks
        : [...settings.selectedTracks, trackId]
      await db.userSettings.update(keys[0], {
        primaryTrack: trackId,
        selectedTracks: current,
      })
    }
    setShowSwitchSheet(false)
  }

  return (
    <div className="page pb-32">
      {/* 顶部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的主题</h1>
          <p className="text-sm text-gray-500 mt-0.5">专注一个场景，学透它</p>
        </div>
        {otherTracks.length > 0 && (
          <button
            onClick={() => setShowSwitchSheet(true)}
            className="flex items-center gap-1 text-sm text-brand-600 font-medium px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 transition"
          >
            切换
            <ChevronDown size={14} />
          </button>
        )}
      </div>

      {/* 主题英雄卡 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`card bg-gradient-to-br ${colors.bg} border-2 ${colors.border} mb-6`}
      >
        {/* 主题标题 */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-4xl">{activeTrack.icon}</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{activeTrack.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{activeTrack.description}</p>
          </div>
        </div>

        {/* 连续打卡 + 进度 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
            <Flame size={18} className="text-orange-500" />
            <span className="text-sm font-bold text-orange-700">
              {streak > 0 ? `${streak} 天连续` : '今日打卡'}
            </span>
          </div>
          <div className="flex-1 text-right">
            <span className="text-sm font-bold text-gray-700">{completionPercent}%</span>
            <span className="text-xs text-gray-400 ml-1">
              ({completedStages.length}/{totalStages} 关)
            </span>
          </div>
        </div>

        {/* 进度条（含章节分隔） */}
        <div className="mb-5">
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-1.5">
            <motion.div
              className={`h-full ${colors.progress} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-gray-400">
            {completedChapters > 0
              ? `已完成 ${completedChapters} 章 · `
              : ''}
            {nextChapter
              ? `当前：${nextChapter.title}`
              : completionPercent === 100
              ? '🎉 全部完成'
              : ''}
          </p>
        </div>

        {/* 3个统计 */}
        <div className="grid grid-cols-3 gap-2 pb-5 mb-5 border-b border-gray-200/60">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <Target size={13} />
              <span className="text-xs">等级</span>
            </div>
            <p className="text-lg font-bold text-gray-800">Lv{trackProgress?.currentLevel ?? 1}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <BookOpen size={13} />
              <span className="text-xs">词汇</span>
            </div>
            <p className="text-lg font-bold text-gray-800">
              {learnedWords}
              <span className="text-xs font-normal text-gray-400">/{trackWords.length}</span>
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <Star size={13} />
              <span className="text-xs">章节</span>
            </div>
            <p className="text-lg font-bold text-gray-800">
              {completedChapters}
              <span className="text-xs font-normal text-gray-400">/{totalChapters}</span>
            </p>
          </div>
        </div>

        {/* 下一关预览 */}
        {nextStage && nextChapter && (
          <div className="bg-white/70 rounded-xl p-3 mb-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-gray-800">{nextStage.title}</p>
                <p className="text-xs text-gray-500">{nextChapter.title} · {nextStage.theme}</p>
              </div>
              <span className="text-xs text-gray-400">{nextStage.wordIds.length} 词</span>
            </div>
            {previewWords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {previewWords.map((w) => (
                  <span key={w.id} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {w.word}
                  </span>
                ))}
                {nextStage.wordIds.length > 3 && (
                  <span className="text-xs text-gray-400 py-0.5">+{nextStage.wordIds.length - 3}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 继续学习按钮 */}
        {nextStage ? (
          <motion.button
            onClick={() => navigate(`/stage/${nextStage.id}`)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-4 px-4 rounded-xl font-bold text-white text-lg ${colors.progress} hover:shadow-lg transition flex items-center justify-center gap-2`}
          >
            继续学习
            <ChevronRight size={20} />
          </motion.button>
        ) : (
          <div className="w-full py-4 text-center rounded-xl bg-green-100 text-green-700 font-semibold">
            🎉 已完成全部关卡！
          </div>
        )}
      </motion.div>

      {/* 全部关卡入口 */}
      <button
        onClick={() => navigate(`/track/${activeTrack.id}`)}
        className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition mb-6"
      >
        查看全部关卡
      </button>

      {/* 练习巩固 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-500">练习巩固</p>
          {learnedWords === 0 && (
            <p className="text-xs text-gray-400">先学几个词再来练</p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '快速刷词', icon: <Zap size={22} className="text-amber-500" />, path: `/quick-quiz/${activeTrack.id}`, color: 'hover:border-amber-300 hover:bg-amber-50' },
            { label: '限时挑战', icon: <Clock size={22} className="text-red-500" />, path: `/challenge/${activeTrack.id}`, color: 'hover:border-red-300 hover:bg-red-50' },
            { label: '对话练习', icon: <MessageCircle size={22} className="text-purple-500" />, path: `/dialogue/${activeTrack.id}`, color: 'hover:border-purple-300 hover:bg-purple-50' },
          ].map((item) => (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`relative p-4 bg-white rounded-2xl border border-gray-200 ${item.color} transition text-center`}
            >
              {learnedWords > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1">
                  {learnedWords}
                </span>
              )}
              <div className="flex justify-center mb-1.5">{item.icon}</div>
              <p className="text-xs font-semibold text-gray-700">{item.label}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 切换主题底部弹出 */}
      <AnimatePresence>
        {showSwitchSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSwitchSheet(false)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-screen-sm mx-auto bg-white rounded-t-3xl p-6 pb-10"
            >
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">切换学习主题</h3>
              <p className="text-sm text-gray-500 mb-5">当前主题进度会保存，随时可以切回。</p>

              <div className="space-y-3">
                {otherTracks.map((track) => (
                  <motion.button
                    key={track.id}
                    onClick={() => switchTheme(track.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full card text-left hover:border-brand-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{track.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{track.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{track.description}</p>
                      </div>
                      <ChevronRight size={18} className="ml-auto text-gray-400" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
