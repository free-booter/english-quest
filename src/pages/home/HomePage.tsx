import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, ChevronRight, NotebookPen, Shuffle, Compass } from 'lucide-react'
import { motion } from 'framer-motion'
import { db } from '../../db/db'
import { aggregateWeeklyStats, calcConsecutiveCheckInDays } from '../../utils/stats'

export default function HomePage() {
  const navigate = useNavigate()
  const tracks = useLiveQuery(() => db.tracks.toArray())
  const settings = useLiveQuery(() => db.userSettings.toCollection().first())
  const reviewItems = useLiveQuery(() => {
    const today = new Date().toISOString().split('T')[0]
    return db.reviews.where('nextReviewDate').belowOrEqual(today).count()
  })
  const stages = useLiveQuery(() => db.stages.toArray())
  const checkIns = useLiveQuery(() => db.checkIns.toArray())
  const words = useLiveQuery(() => db.words.toArray())
  const chapters = useLiveQuery(() => db.chapters.toArray())

  const reviewCount = reviewItems ?? 0
  const selectedTracks = tracks?.filter((t) => settings?.selectedTracks.includes(t.id)) ?? []
  const primaryTrack = tracks?.find((t) => t.id === settings?.primaryTrack) ?? selectedTracks[0]

  const nextStage = (() => {
    if (!primaryTrack || !stages) return undefined
    return stages
      .filter((s) => s.trackId === primaryTrack.id && s.status !== 'completed')
      .sort((a, b) => a.index - b.index)[0]
  })()

  const nextChapter = nextStage ? chapters?.find((c) => c.id === nextStage.chapterId) : null
  const previewWords = nextStage
    ? words?.filter((w) => nextStage.wordIds.includes(w.id)).slice(0, 4) ?? []
    : []

  const thisWeekStats = aggregateWeeklyStats(checkIns ?? [])
  const streakDays = calcConsecutiveCheckInDays(checkIns ?? [])

  const dailyGoal = settings?.dailyGoal ?? 5
  const todayCheckIn = checkIns?.find((c) => c.date === new Date().toISOString().split('T')[0])
  const todayWords = todayCheckIn?.wordsLearned ?? 0
  const dailyProgress = Math.min(100, Math.round((todayWords / dailyGoal) * 100))

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return '早上好'
    if (h < 18) return '下午好'
    return '晚上好'
  })()

  return (
    <div className="min-h-screen max-w-screen-sm mx-auto pb-28 overflow-x-hidden">

      {/* ── 方向一：全屏蓝色头区，边到边 ── */}
      <div
        className="px-5 pt-14 pb-24"
        style={{ background: 'linear-gradient(150deg, #0369A1 0%, #0EA5E9 100%)' }}
      >
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-white/60 font-medium mb-0.5">{greeting}</p>
            <h1 className="text-3xl font-black text-white leading-tight">
              {settings?.nickname ?? '冒险者'}
            </h1>
            <p className="text-xs text-white/50 mt-1">Lv{settings?.totalLevel ?? 1} · {settings?.totalXP ?? 0} XP</p>
          </div>
          <div className="text-right pb-0.5">
            <p className="text-xs text-white/50 mb-1">今日目标</p>
            <p className="text-3xl font-black text-white leading-none">
              {todayWords}
              <span className="text-base font-semibold text-white/50">/{dailyGoal}</span>
            </p>
          </div>
        </div>
        <div className="mt-5 h-1 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${dailyProgress}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="px-4">
        {/* ── 悬浮叠出的主 CTA 卡 ── */}
        {nextStage && primaryTrack && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="-mt-14 relative z-10 bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.13)] p-6 mb-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{primaryTrack.icon}</span>
                <span className="text-xs font-black text-brand-500 tracking-widest uppercase">
                  {primaryTrack.name}
                </span>
                {nextChapter && (
                  <>
                    <span className="text-gray-200 text-xs">·</span>
                    <span className="text-xs text-gray-400">{nextChapter.title}</span>
                  </>
                )}
              </div>
              <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full font-medium">
                {nextStage.wordIds.length} 词
              </span>
            </div>

            <h2 className="text-5xl font-black text-gray-900 leading-none tracking-tight mb-2">
              {nextStage.title}
            </h2>
            <p className="text-sm text-gray-400 mb-5">{nextStage.theme}</p>

            {previewWords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {previewWords.map((w) => (
                  <span key={w.id} className="px-3 py-1 bg-brand-50 text-brand-600 text-xs font-semibold rounded-full">
                    {w.word}
                  </span>
                ))}
                {nextStage.wordIds.length > 4 && (
                  <span className="px-3 py-1 bg-gray-50 text-gray-400 text-xs rounded-full">
                    +{nextStage.wordIds.length - 4}
                  </span>
                )}
              </div>
            )}

            <motion.button
              onClick={() => navigate(`/stage/${nextStage.id}`)}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-brand-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(14,165,233,0.35)]"
            >
              开始学习
              <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        )}

        {/* ── 复习提醒 ── */}
        {reviewCount > 0 && (
          <motion.button
            onClick={() => navigate('/review')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full mb-4 flex items-center gap-3 bg-brand-50 rounded-2xl px-4 py-3"
          >
            <NotebookPen size={15} className="text-brand-500 shrink-0" />
            <span className="text-sm font-semibold text-brand-700 flex-1 text-left">
              {reviewCount} 个词等待复习
            </span>
            <ChevronRight size={14} className="text-brand-400 shrink-0" />
          </motion.button>
        )}

        {/* ── 方向三：Bento 磁贴，主次不等大 ── */}
        <div className="grid grid-cols-3 gap-3">

          {/* 随机挑战 — 2/3 宽，主操作 */}
          <motion.button
            onClick={() => {
              if (stages && stages.length > 0) {
                const pool = stages.filter((s) => s.status !== 'completed')
                const pick = pool.length > 0
                  ? pool[Math.floor(Math.random() * pool.length)]
                  : stages[Math.floor(Math.random() * stages.length)]
                navigate(`/stage/${pick.id}`)
              }
            }}
            whileTap={{ scale: 0.97 }}
            className="col-span-2 bg-brand-500 rounded-2xl p-4 text-left shadow-[0_4px_14px_rgba(14,165,233,0.3)]"
          >
            <Shuffle size={20} className="text-white mb-3" />
            <p className="text-sm font-bold text-white">随机挑战</p>
            <p className="text-xs text-white/60 mt-0.5">随机选一关</p>
          </motion.button>

          {/* 连续打卡 — 1/3 宽 */}
          <div className="bg-white rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <Flame size={16} className="text-red-400 mb-1.5" />
            <p className="text-2xl font-black text-gray-900 leading-none">{streakDays}</p>
            <p className="text-xs text-gray-400 mt-1">连续天</p>
          </div>

          {/* 本周学词 — 1/3 宽 */}
          <div className="bg-white rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <p className="text-2xl font-black text-gray-900 leading-none">{thisWeekStats.words}</p>
            <p className="text-xs text-gray-400 mt-1.5">本周词</p>
          </div>

          {/* 选择主题 — 2/3 宽，次操作 */}
          <motion.button
            onClick={() => navigate('/tracks')}
            whileTap={{ scale: 0.97 }}
            className="col-span-2 bg-white rounded-2xl p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          >
            <Compass size={20} className="text-brand-500 mb-3" />
            <p className="text-sm font-bold text-gray-800">选择主题</p>
            <p className="text-xs text-gray-400 mt-0.5">切换学习内容</p>
          </motion.button>

        </div>
      </div>
    </div>
  )
}
