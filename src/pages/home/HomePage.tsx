import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { db } from '../../db/db'
import { aggregateWeeklyStats, calcConsecutiveCheckInDays } from '../../utils/stats'

export default function HomePage() {
  const navigate = useNavigate()
  const tracks = useLiveQuery(() => db.tracks.toArray())
  const settings = useLiveQuery(() => db.userSettings.toCollection().first())
  const reviewItems = useLiveQuery(() => {
    const today = new Date().toISOString().split('T')[0]
    return db.reviews
      .where('nextReviewDate')
      .belowOrEqual(today)
      .count()
  })
  const stages = useLiveQuery(() => db.stages.toArray())
  const checkIns = useLiveQuery(() => db.checkIns.toArray())

  const reviewCount = reviewItems ?? 0
  const selectedTracks = tracks?.filter((track) => settings?.selectedTracks.includes(track.id)) ?? []
  const primaryTrack = tracks?.find((track) => track.id === settings?.primaryTrack) ?? selectedTracks[0]
  const chapters = useLiveQuery(() => db.chapters.toArray())

  // 获取下一个待学舞台
  const nextStage = useLiveQuery(() => {
    if (!primaryTrack || !stages) return undefined
    return stages
      .filter((s) => s.trackId === primaryTrack.id && s.status === 'inProgress')
      .sort((a, b) => a.index - b.index)[0]
  }, [primaryTrack, stages, chapters])

  const thisWeekStats = aggregateWeeklyStats(checkIns ?? [])
  const streakDays = calcConsecutiveCheckInDays(checkIns ?? [])

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return '早上好'
    if (hour < 18) return '下午好'
    return '晚上好'
  })()

  return (
    <div className="page pb-32">
      {/* 顶部：欢迎语 + 等级/XP */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-800 mb-1">
          👋 {greeting}，{settings?.nickname ?? '冒险者'}！
        </h1>
        <p className="text-sm text-gray-500">
          Lv{settings?.totalLevel ?? 1} · 总 XP {settings?.totalXP ?? 0} · 连续打卡 {streakDays} 天
        </p>
      </div>

      {/* 核心操作区：推荐舞台卡片（加大）*/}
      {nextStage && primaryTrack && (
        <motion.button
          onClick={() => navigate(`/stage/${nextStage.id}`)}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-6 card bg-gradient-to-br from-brand-50 to-indigo-50 border-2 border-brand-200 hover:shadow-lg transition overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-brand-600 uppercase mb-2">📍 下一个舞台（推荐）</p>
              <p className="text-xl font-bold text-gray-900 mb-1">{primaryTrack.icon} {nextStage.title}</p>
              <p className="text-sm text-gray-600">{nextStage.theme}</p>
            </div>
            <div className="text-5xl opacity-15 ml-3">{primaryTrack.icon}</div>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-200 flex justify-between items-center">
            <span className="text-sm text-gray-600">立即学习</span>
            <ArrowRight size={20} className="text-brand-600 group-hover:translate-x-1 transition" />
          </div>
        </motion.button>
      )}

      {/* 快速操作按钮区 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.button
          onClick={() => {
            if (stages && stages.length > 0) {
              const uncompletedStages = stages.filter(s => s.status !== 'completed')
              const randomStage = uncompletedStages.length > 0
                ? uncompletedStages[Math.floor(Math.random() * uncompletedStages.length)]
                : stages[Math.floor(Math.random() * stages.length)]
              navigate(`/stage/${randomStage.id}`)
            }
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="card bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 text-left hover:shadow-md transition"
        >
          <p className="text-2xl mb-2">🎲</p>
          <p className="text-sm font-semibold text-gray-800">随机挑战</p>
          <p className="text-xs text-gray-600 mt-1">快速开始</p>
        </motion.button>

        <motion.button
          onClick={() => navigate('/tracks')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="card bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 text-left hover:shadow-md transition"
        >
          <p className="text-2xl mb-2">📖</p>
          <p className="text-sm font-semibold text-gray-800">选择赛道</p>
          <p className="text-xs text-gray-600 mt-1">管理轨道</p>
        </motion.button>
      </div>

      {/* 复习提醒（如果有）*/}
      {reviewCount > 0 && (
        <motion.button
          onClick={() => navigate('/review')}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-6 card bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 flex items-center justify-between group hover:shadow-md transition"
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="text-2xl">⏰</span>
            <div className="text-left flex-1">
              <p className="font-semibold text-gray-800">有 {reviewCount} 个词需要复习</p>
              <p className="text-xs text-gray-600">坚持复习效果最佳</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-gray-400 group-hover:translate-x-1 transition" />
        </motion.button>
      )}

      {/* 连续打卡卡片 */}
      <div className="mb-6 relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-indigo-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-35 transition-opacity" />
        <div className="card-accent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-brand-500/10 rounded-full -mr-14 -mt-14" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flame size={18} className="text-orange-500 animate-pulse" />
                <span className="text-sm font-semibold text-brand-600">连续打卡</span>
              </div>
              <p className="text-4xl font-bold text-brand-700" style={{ fontFamily: 'Poppins' }}>
                {streakDays}
              </p>
              <p className="text-xs text-gray-500 mt-1">天 · 坚持就是胜利 🚀</p>
            </div>
            <div className="text-5xl opacity-20">🔥</div>
          </div>
        </div>
      </div>

      {/* 关键统计数据（3个）*/}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-brand-600 mb-1">{thisWeekStats.words}</p>
          <p className="text-xs text-gray-600">本周学词</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-purple-600 mb-1">{thisWeekStats.stages}</p>
          <p className="text-xs text-gray-600">总完成</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-orange-600 mb-1">{streakDays}</p>
          <p className="text-xs text-gray-600">打卡天数</p>
        </div>
      </div>
    </div>
  )
}
