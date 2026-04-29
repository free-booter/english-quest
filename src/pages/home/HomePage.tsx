import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, ChevronRight, Target, BookOpen, Trophy } from 'lucide-react'
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
  const selectedTracks = tracks?.filter((track) => settings?.selectedTracks.includes(track.id)) ?? []
  const primaryTrack = tracks?.find((track) => track.id === settings?.primaryTrack) ?? selectedTracks[0]

  // 获取下一个待学舞台
  const nextStage = (() => {
    if (!primaryTrack || !stages) return undefined
    return stages
      .filter((s) => s.trackId === primaryTrack.id && s.status !== 'completed')
      .sort((a, b) => a.index - b.index)[0]
  })()

  const nextChapter = nextStage ? chapters?.find((c) => c.id === nextStage.chapterId) : null

  // 下一关的词汇预览
  const previewWords = nextStage ? words?.filter((w) => nextStage.wordIds.includes(w.id)).slice(0, 3) ?? [] : []

  const thisWeekStats = aggregateWeeklyStats(checkIns ?? [])
  const streakDays = calcConsecutiveCheckInDays(checkIns ?? [])

  // 今日目标进度
  const dailyGoal = settings?.dailyGoal ?? 5
  const todayCheckIn = checkIns?.find((c) => c.date === new Date().toISOString().split('T')[0])
  const todayWords = todayCheckIn?.wordsLearned ?? 0
  const dailyProgress = Math.min(100, Math.round((todayWords / dailyGoal) * 100))

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return '早上好'
    if (hour < 18) return '下午好'
    return '晚上好'
  })()

  // 已完成关卡数
  const completedStages = stages?.filter((s) => s.status === 'completed').length ?? 0

  return (
    <div className="page pb-32">
      {/* 顶部：欢迎语 + 等级 */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          {greeting}，{settings?.nickname ?? '冒险者'}
        </h1>
        <p className="text-sm text-gray-500">Lv{settings?.totalLevel ?? 1} · {settings?.totalXP ?? 0} XP</p>
      </div>

      {/* 今日目标进度 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mb-4 bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-200"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-700">今日目标</span>
          </div>
          <span className="text-sm font-bold text-brand-600">
            {todayWords}/{dailyGoal} 词
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${dailyProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {dailyProgress >= 100 && (
          <p className="text-xs text-green-600 mt-2 font-medium">目标已达成！继续加油 ~</p>
        )}
      </motion.div>

      {/* 复习提醒（优先级高，放在上方）*/}
      {reviewCount > 0 && (
        <motion.button
          onClick={() => navigate('/review')}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-4 card bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 flex items-center justify-between group hover:shadow-md transition"
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="text-2xl">📖</span>
            <div className="text-left flex-1">
              <p className="font-semibold text-gray-800">{reviewCount} 个词需要复习</p>
              <p className="text-xs text-gray-600">及时复习，记忆更牢固</p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-amber-500 text-white text-sm font-semibold rounded-lg">
            复习
          </div>
        </motion.button>
      )}

      {/* 推荐舞台卡片（核心 CTA）*/}
      {nextStage && primaryTrack && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 card bg-white border-2 border-gray-200 overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{primaryTrack.icon}</span>
            <span className="text-xs font-semibold text-gray-500 uppercase">推荐学习</span>
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-1">{nextStage.title}</h2>
          <p className="text-sm text-gray-600 mb-3">
            {nextChapter?.title} · {nextStage.theme}
          </p>

          {/* 词汇预览 */}
          {previewWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {previewWords.map((w) => (
                <span key={w.id} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg">
                  {w.word} <span className="text-gray-400">{w.meaning}</span>
                </span>
              ))}
              {nextStage.wordIds.length > 3 && (
                <span className="px-2 py-1 text-gray-400 text-xs">+{nextStage.wordIds.length - 3}</span>
              )}
            </div>
          )}

          <motion.button
            onClick={() => navigate(`/stage/${nextStage.id}`)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 bg-gradient-to-r from-brand-500 to-indigo-500 text-white font-semibold rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            开始学习
            <ChevronRight size={18} />
          </motion.button>
        </motion.div>
      )}

      {/* 快速操作按钮 */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <motion.button
          onClick={() => {
            if (stages && stages.length > 0) {
              const uncompletedStages = stages.filter((s) => s.status !== 'completed')
              const randomStage =
                uncompletedStages.length > 0
                  ? uncompletedStages[Math.floor(Math.random() * uncompletedStages.length)]
                  : stages[Math.floor(Math.random() * stages.length)]
              navigate(`/stage/${randomStage.id}`)
            }
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="card bg-gray-50 border border-gray-200 text-left hover:bg-gray-100 transition"
        >
          <p className="text-xl mb-1">🎲</p>
          <p className="text-sm font-semibold text-gray-800">随机挑战</p>
        </motion.button>

        <motion.button
          onClick={() => navigate('/tracks')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="card bg-gray-50 border border-gray-200 text-left hover:bg-gray-100 transition"
        >
          <p className="text-xl mb-1">📚</p>
          <p className="text-sm font-semibold text-gray-800">选择主题</p>
        </motion.button>
      </div>

      {/* 连续打卡（单一展示）*/}
      <div className="mb-5">
        <div className="card bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Flame size={24} className="text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">连续打卡</p>
                <p className="text-2xl font-bold text-orange-600">{streakDays} 天</p>
              </div>
            </div>
            {streakDays >= 7 && <span className="text-2xl">🔥</span>}
          </div>
        </div>
      </div>

      {/* 学习统计（精简为 3 个）*/}
      <div className="grid grid-cols-3 gap-2">
        <div className="card text-center py-3">
          <BookOpen size={18} className="mx-auto mb-1 text-blue-500" />
          <p className="text-lg font-bold text-gray-800">{thisWeekStats.words}</p>
          <p className="text-xs text-gray-500">本周学词</p>
        </div>
        <div className="card text-center py-3">
          <Trophy size={18} className="mx-auto mb-1 text-purple-500" />
          <p className="text-lg font-bold text-gray-800">{completedStages}</p>
          <p className="text-xs text-gray-500">完成关卡</p>
        </div>
        <div className="card text-center py-3">
          <Target size={18} className="mx-auto mb-1 text-green-500" />
          <p className="text-lg font-bold text-gray-800">{thisWeekStats.stages}</p>
          <p className="text-xs text-gray-500">本周通关</p>
        </div>
      </div>
    </div>
  )
}
