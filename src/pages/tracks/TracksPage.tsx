import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, BookOpen, Target, Star, Flame, ChevronDown, Zap, Clock, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../../db/db'
import { calcConsecutiveCheckInDays } from '../../utils/stats'
import { getTrackColors } from '../../utils/trackColors'

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

  const tc = getTrackColors(activeTrack.id)

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
      {/* 标题栏 */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-1">当前学习主题</p>
          <h1 className="text-3xl font-black text-gray-900">{activeTrack.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{activeTrack.description}</p>
        </div>
        {otherTracks.length > 0 && (
          <button
            onClick={() => setShowSwitchSheet(true)}
            className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-full bg-white shadow-sm text-gray-600 shrink-0"
          >
            切换
            <ChevronDown size={14} />
          </button>
        )}
      </div>

      {/* 进度卡 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.07)] overflow-hidden"
      >
        <div className={`${tc.bg} px-5 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{activeTrack.icon}</span>
              <div>
                <p className="text-sm font-bold text-white/80">学习进度</p>
                <p className="text-xs text-white/60 mt-0.5">{completedStages.length}/{totalStages} 关已完成</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-white">{completionPercent}%</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-3">
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className={`h-full ${tc.progress}`}
              initial={{ width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </motion.div>

      {/* 统计三格 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card py-4 text-center">
          <Target size={14} className={`mx-auto mb-1 ${tc.text}`} />
          <p className="text-xl font-black text-gray-900">Lv{trackProgress?.currentLevel ?? 1}</p>
          <p className="text-xs text-gray-400 font-medium">等级</p>
        </div>
        <div className="card py-4 text-center">
          <BookOpen size={14} className={`mx-auto mb-1 ${tc.text}`} />
          <p className="text-xl font-black text-gray-900">
            {learnedWords}
            <span className="text-xs font-medium text-gray-400">/{trackWords.length}</span>
          </p>
          <p className="text-xs text-gray-400 font-medium">词汇</p>
        </div>
        <div className="card py-4 text-center">
          <Star size={14} className={`mx-auto mb-1 ${tc.text}`} />
          <p className="text-xl font-black text-gray-900">
            {completedChapters}
            <span className="text-xs font-medium text-gray-400">/{totalChapters}</span>
          </p>
          <p className="text-xs text-gray-400 font-medium">章节</p>
        </div>
      </div>

      {/* 打卡连续 */}
      <div className="card mb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <Flame size={24} className="text-red-500" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">连续打卡</p>
          <p className="text-3xl font-black text-gray-900 leading-tight mt-0.5">
            {streak > 0 ? streak : '—'}
            {streak > 0 && <span className="text-base font-medium text-gray-400 ml-1">天</span>}
          </p>
          {nextChapter && (
            <p className="text-xs text-gray-400 mt-0.5">当前章节：{nextChapter.title}</p>
          )}
        </div>
        {streak >= 7 && <span className="text-3xl">🔥</span>}
      </div>

      {/* 下一关 */}
      {nextStage && nextChapter && (
        <div className="card mb-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${tc.text}`}>下一关</p>
              <h3 className="text-lg font-black text-gray-900">{nextStage.title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{nextChapter.title} · {nextStage.theme}</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{nextStage.wordIds.length} 词</span>
          </div>
          {previewWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {previewWords.map((w) => (
                <span key={w.id} className={`px-2.5 py-0.5 ${tc.bgLight} ${tc.text} text-xs font-semibold rounded-full`}>
                  {w.word}
                </span>
              ))}
              {nextStage.wordIds.length > 3 && (
                <span className="text-xs text-gray-400 py-0.5">+{nextStage.wordIds.length - 3}</span>
              )}
            </div>
          )}
          <motion.button
            onClick={() => navigate(`/stage/${nextStage.id}`)}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 text-white font-bold rounded-full flex items-center justify-center gap-2"
            style={{ backgroundColor: tc.hex, boxShadow: `0 4px 14px ${tc.shadow}` }}
          >
            继续学习
            <ChevronRight size={18} />
          </motion.button>
        </div>
      )}

      <button
        onClick={() => navigate(`/track/${activeTrack.id}`)}
        className="w-full py-3 rounded-full bg-white shadow-sm text-gray-600 text-sm font-semibold mb-6 border border-gray-100"
      >
        查看全部关卡
      </button>

      {/* 练习巩固 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">练习巩固</p>
          {learnedWords === 0 && (
            <p className="text-xs text-gray-400">先学几个词再来练</p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: '快速刷词',
              icon: <Zap size={22} className="text-brand-500" />,
              path: `/quick-quiz/${activeTrack.id}`,
              activeBg: 'hover:bg-brand-50',
            },
            {
              label: '限时挑战',
              icon: <Clock size={22} className="text-brand-500" />,
              path: `/challenge/${activeTrack.id}`,
              activeBg: 'hover:bg-brand-50',
            },
            {
              label: '对话练习',
              icon: <MessageCircle size={22} className="text-brand-500" />,
              path: `/dialogue/${activeTrack.id}`,
              activeBg: 'hover:bg-brand-50',
            },
          ].map((item) => (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.97 }}
              className={`relative p-4 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${item.activeBg} transition text-center`}
            >
              {learnedWords > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1">
                  {learnedWords}
                </span>
              )}
              <div className="flex justify-center mb-1.5">{item.icon}</div>
              <p className="text-xs font-bold text-gray-700">{item.label}</p>
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
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <h3 className="text-xl font-black text-gray-900 mb-1">切换学习主题</h3>
              <p className="text-sm text-gray-400 mb-5">当前主题进度会保存，随时可以切回。</p>
              <div className="space-y-3">
                {otherTracks.map((track) => {
                  const otc = getTrackColors(track.id)
                  return (
                    <motion.button
                      key={track.id}
                      onClick={() => switchTheme(track.id)}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.07)] p-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${otc.bg} flex items-center justify-center text-2xl shrink-0`}>
                          {track.icon}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{track.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{track.description}</p>
                        </div>
                        <ChevronRight size={18} className="ml-auto text-gray-300 shrink-0" />
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
