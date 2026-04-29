import { useState } from 'react'
import { TrendingUp, Settings, Info, ChevronRight, BookX, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../../db/db'
import CheckInCalendar from '../../components/CheckInCalendar'
import { AVATARS, DAILY_GOALS } from '../../constants/game'
import { aggregateWeeklyStats, calcConsecutiveCheckInDays } from '../../utils/stats'
import { UserSettings } from '../../types'

type ModalType = 'avatar' | 'nickname' | 'settings' | 'about' | null

export default function MePage() {
  const navigate = useNavigate()
  const settings = useLiveQuery(() => db.userSettings.toCollection().first())
  const stages = useLiveQuery(() => db.stages.toArray())
  const checkIns = useLiveQuery(() => db.checkIns.toArray())
  const wrongCount = useLiveQuery(() => db.wrongAnswers.filter((w) => !w.resolved).count())
  const avatar = AVATARS.find((item) => item.id === settings?.avatar)

  const [modal, setModal] = useState<ModalType>(null)
  const [nicknameInput, setNicknameInput] = useState('')

  const thisWeekStats = aggregateWeeklyStats(checkIns ?? [])
  const streakDays = calcConsecutiveCheckInDays(checkIns ?? [])

  const completedStages = stages?.filter((s) => s.status === 'completed') ?? []
  const avgStars =
    completedStages.length > 0
      ? Math.round((completedStages.reduce((sum, s) => sum + (s.stars ?? 0), 0) / completedStages.length) * 10) / 10
      : 0

  const updateSettings = async (updates: Partial<UserSettings>) => {
    const ids = (await db.userSettings.toCollection().primaryKeys()) as number[]
    if (ids.length > 0) {
      await db.userSettings.update(ids[0], updates)
    }
  }

  const handleAvatarSelect = async (avatarId: string) => {
    await updateSettings({ avatar: avatarId as UserSettings['avatar'] })
    setModal(null)
  }

  const handleNicknameSave = async () => {
    const trimmed = nicknameInput.trim()
    if (trimmed && trimmed.length <= 12) {
      await updateSettings({ nickname: trimmed })
      setModal(null)
    }
  }

  const handleDailyGoalChange = async (goal: number) => {
    await updateSettings({ dailyGoal: goal })
  }

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
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setModal('avatar')}
              className="text-5xl hover:scale-110 transition-transform"
            >
              {avatar?.icon ?? '🦊'}
            </button>
            <div className="flex-1">
              <p className="text-xl font-bold text-gray-900">{settings?.nickname ?? '冒险者'}</p>
              <p className="text-sm text-gray-600">
                Lv{settings?.totalLevel ?? 1} · {settings?.totalXP ?? 0} XP
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 pb-4 border-b border-brand-200">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-brand-600">{streakDays}</p>
              <p className="text-xs text-gray-600">连续打卡</p>
            </div>
            <div className="w-px h-8 bg-brand-200" />
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-purple-600">{completedStages.length}</p>
              <p className="text-xs text-gray-600">完成关卡</p>
            </div>
            <div className="w-px h-8 bg-brand-200" />
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-amber-500">{'★'.repeat(Math.round(avgStars)) || '-'}</p>
              <p className="text-xs text-gray-600">平均星级</p>
            </div>
          </div>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setModal('avatar')}
              className="flex-1 py-2 px-3 bg-white border border-brand-200 rounded-lg text-sm font-semibold text-brand-600 hover:shadow-md transition"
            >
              换头像
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setNicknameInput(settings?.nickname ?? '')
                setModal('nickname')
              }}
              className="flex-1 py-2 px-3 bg-white border border-brand-200 rounded-lg text-sm font-semibold text-brand-600 hover:shadow-md transition"
            >
              改昵称
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* 本周学习统计（精简） */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card mb-6"
      >
        <p className="text-sm font-bold text-gray-700 mb-3">本周学习</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{thisWeekStats.words}</p>
            <p className="text-xs text-gray-600">学习词汇</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{thisWeekStats.stages}</p>
            <p className="text-xs text-gray-600">完成关卡</p>
          </div>
        </div>
      </motion.div>

      {/* 打卡日历 */}
      <div className="mb-6">
        <CheckInCalendar />
      </div>

      {/* 菜单项 */}
      <div className="space-y-2 mb-6">
        <MenuItem
          icon="🎯"
          iconBg="bg-blue-100"
          title="主题选择"
          subtitle="管理你的学习主题"
          onClick={() => navigate('/tracks')}
        />

        <MenuItem
          icon="📒"
          iconBg="bg-emerald-100"
          title="我的单词本"
          subtitle="查看已学单词与掌握度"
          onClick={() => navigate('/vocabulary')}
        />

        <MenuItem
          icon={<BookX size={20} className="text-red-600" />}
          iconBg="bg-red-100"
          title="错题本"
          subtitle={wrongCount && wrongCount > 0 ? `${wrongCount} 个题目待重学` : '暂无错题'}
          badge={wrongCount && wrongCount > 0 ? wrongCount : undefined}
          onClick={() => navigate('/wrong-answers')}
        />

        <MenuItem
          icon={<Settings size={20} className="text-purple-600" />}
          iconBg="bg-purple-100"
          title="学习设置"
          subtitle="每日目标、语速调节"
          onClick={() => setModal('settings')}
        />

        <MenuItem
          icon={<TrendingUp size={20} className="text-yellow-600" />}
          iconBg="bg-yellow-100"
          title="成就墙"
          subtitle="查看已解锁的成就"
          onClick={() => navigate('/achievements')}
        />

        <MenuItem
          icon={<Info size={20} className="text-gray-600" />}
          iconBg="bg-gray-100"
          title="关于"
          subtitle="版本信息与反馈"
          onClick={() => setModal('about')}
        />
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">English Quest v0.1.0</p>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal === 'avatar' && (
          <Modal title="选择头像" onClose={() => setModal(null)}>
            <div className="grid grid-cols-3 gap-3">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleAvatarSelect(a.id)}
                  className={`p-4 rounded-xl border-2 transition hover:scale-105 ${
                    settings?.avatar === a.id
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-4xl block mb-1">{a.icon}</span>
                  <span className="text-xs text-gray-600">{a.label}</span>
                </button>
              ))}
            </div>
          </Modal>
        )}

        {modal === 'nickname' && (
          <Modal title="修改昵称" onClose={() => setModal(null)}>
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              maxLength={12}
              placeholder="输入新昵称（最多12字）"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg focus:outline-none focus:border-brand-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                onClick={handleNicknameSave}
                disabled={!nicknameInput.trim()}
                className="flex-1 py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </Modal>
        )}

        {modal === 'settings' && (
          <Modal title="学习设置" onClose={() => setModal(null)}>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">每日学习目标</p>
                <div className="flex gap-2">
                  {DAILY_GOALS.map((goal) => (
                    <button
                      key={goal}
                      onClick={() => handleDailyGoalChange(goal)}
                      className={`flex-1 py-3 rounded-xl font-semibold transition ${
                        settings?.dailyGoal === goal
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {goal} 词/天
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">发音语速</p>
                <div className="flex gap-2">
                  {[0.75, 1, 1.25].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => updateSettings({ ttsRate: rate })}
                      className={`flex-1 py-3 rounded-xl font-semibold transition ${
                        settings?.ttsRate === rate
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {rate === 0.75 ? '慢速' : rate === 1 ? '正常' : '快速'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        )}

        {modal === 'about' && (
          <Modal title="关于" onClose={() => setModal(null)}>
            <div className="text-center py-4">
              <p className="text-4xl mb-3">📚</p>
              <p className="text-lg font-bold text-gray-800 mb-1">English Quest</p>
              <p className="text-sm text-gray-500 mb-4">版本 0.1.0</p>
              <p className="text-sm text-gray-600 mb-4">
                游戏化英语学习应用，通过兴趣轨道和场景化学习提升词汇记忆效果。
              </p>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-400">如有问题或建议，欢迎反馈</p>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

// 菜单项组件
function MenuItem({
  icon,
  iconBg,
  title,
  subtitle,
  badge,
  onClick,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
  badge?: number
  onClick: () => void
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="card w-full flex items-center justify-between hover:bg-gray-50 transition"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          {typeof icon === 'string' ? <span className="text-lg">{icon}</span> : icon}
        </div>
        <div className="text-left">
          <p className="font-semibold text-gray-800">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge !== undefined && (
          <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">{badge}</span>
        )}
        <ChevronRight size={20} className="text-gray-400" />
      </div>
    </motion.button>
  )
}

// 弹窗组件
function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}
