import { TrendingUp, Settings, Info, ChevronRight, BookX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { db } from '../../db/db'
import CheckInCalendar from '../../components/CheckInCalendar'
import { AVATARS } from '../../constants/game'
import { aggregateWeeklyStats, calcConsecutiveCheckInDays } from '../../utils/stats'

export default function MePage() {
  const navigate = useNavigate()
  const settings = useLiveQuery(() => db.userSettings.toCollection().first())
  const stages = useLiveQuery(() => db.stages.toArray())
  const checkIns = useLiveQuery(() => db.checkIns.toArray())
  const wrongCount = useLiveQuery(() => db.wrongAnswers.filter((w) => !w.resolved).count())
  const avatar = AVATARS.find((item) => item.id === settings?.avatar)

  const thisWeekStats = aggregateWeeklyStats(checkIns ?? [])
  const streakDays = calcConsecutiveCheckInDays(checkIns ?? [])

  // 计算平均准确率和星级
  const completedStages = stages?.filter(s => s.status === 'completed') ?? []
  const avgStars = completedStages.length > 0
    ? Math.round(completedStages.reduce((sum, s) => sum + (s.stars ?? 0), 0) / completedStages.length * 10) / 10
    : 0

  return (
    <div className="page pb-32">
      {/* 用户信息卡 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-accent mb-6 overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/10 rounded-full -mr-12 -mt-12" />
        <div className="relative z-10">
          <div className="flex items-end gap-4 mb-4">
            <div className="text-5xl">{avatar?.icon ?? '🦊'}</div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-gray-900">{settings?.nickname ?? '冒险者'}</p>
              <p className="text-sm text-gray-600">
                总等级：<span className="font-semibold">Lv{settings?.totalLevel ?? 1}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-brand-200">
            <div>
              <p className="text-xs text-gray-600 font-medium">总 XP</p>
              <p className="text-xl font-bold text-brand-600">{settings?.totalXP ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">连续打卡</p>
              <p className="text-xl font-bold text-orange-600">{streakDays} 天</p>
            </div>
          </div>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 py-2 px-3 bg-white border border-brand-200 rounded-lg text-sm font-semibold text-brand-600 hover:shadow-md transition"
            >
              编辑头像
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 py-2 px-3 bg-white border border-brand-200 rounded-lg text-sm font-semibold text-brand-600 hover:shadow-md transition"
            >
              编辑昵称
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* 本周学习统计 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card mb-6"
      >
        <p className="text-lg font-bold text-gray-900 mb-4">📊 本周学习统计</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">总词汇</p>
              <p className="text-2xl font-bold text-blue-600">{thisWeekStats.words}</p>
              <p className="text-xs text-gray-500 mt-1">个</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">总关卡</p>
              <p className="text-2xl font-bold text-purple-600">{thisWeekStats.stages}</p>
              <p className="text-xs text-gray-500 mt-1">个</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">平均星级</p>
              <p className="text-2xl font-bold text-amber-600">{'★'.repeat(Math.round(avgStars))}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">打卡天数</p>
              <p className="text-2xl font-bold text-green-600">{streakDays}</p>
              <p className="text-xs text-gray-500 mt-1">天</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 打卡日历 */}
      <div className="mb-6">
        <CheckInCalendar />
      </div>

      {/* 菜单项 */}
      <div className="space-y-3 mb-6">
        {/* 赛道选择 */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/tracks')}
          className="card w-full flex items-center justify-between hover:bg-blue-50/50 transition"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">赛道选择</p>
              <p className="text-xs text-gray-500">管理你的学习轨道</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </motion.button>

        {/* 单词本 */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/vocabulary')}
          className="card w-full flex items-center justify-between hover:bg-emerald-50/50 transition"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <span className="text-lg">📒</span>
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">我的单词本</p>
              <p className="text-xs text-gray-500">查看已学单词与掌握度</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </motion.button>

        {/* 错题本 */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/wrong-answers')}
          className="card w-full flex items-center justify-between hover:bg-red-50/50 transition"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <BookX size={20} className="text-red-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">错题本</p>
              <p className="text-xs text-gray-500">
                {wrongCount && wrongCount > 0 ? `${wrongCount} 个题目待重学` : '暂无错题'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {wrongCount && wrongCount > 0 ? (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {wrongCount}
              </span>
            ) : null}
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </motion.button>

        {/* 学习设置 */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="card w-full flex items-center justify-between hover:bg-purple-50/50 transition"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Settings size={20} className="text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">学习设置</p>
              <p className="text-xs text-gray-500">语速、目标、提醒</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </motion.button>

        {/* 成就 */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/achievements')}
          className="card w-full flex items-center justify-between hover:bg-yellow-50/50 transition"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-yellow-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">成就墙</p>
              <p className="text-xs text-gray-500">查看已解锁的成就</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </motion.button>

        {/* 关于 */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="card w-full flex items-center justify-between hover:bg-gray-50/50 transition"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Info size={20} className="text-gray-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">关于与反馈</p>
              <p className="text-xs text-gray-500">版本信息、反馈渠道</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </motion.button>
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">English Quest v0.0.1</p>
        <p className="text-xs text-gray-300 mt-1">每日一关，坚持学英语 ✨</p>
      </div>
    </div>
  )
}
