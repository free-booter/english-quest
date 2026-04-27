import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { db } from '../../db/db'

export default function TracksPage() {
  const navigate = useNavigate()
  const tracks = useLiveQuery(() => db.tracks.toArray())
  const settings = useLiveQuery(() => db.userSettings.toCollection().first())
  const progress = useLiveQuery(() => db.trackProgress.toArray())
  const stages = useLiveQuery(() => db.stages.toArray())

  if (!tracks || !settings || !progress || !stages) return null

  const selected = tracks.filter((track) => settings.selectedTracks.includes(track.id))
  const unselected = tracks.filter((track) => !settings.selectedTracks.includes(track.id))

  const getTrackStats = (trackId: string) => {
    const trackStages = stages.filter(s => s.trackId === trackId)
    const completedStages = trackStages.filter(s => s.status === 'completed').length
    const totalStages = trackStages.length
    const completionPercent = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0
    return { completedStages, totalStages, completionPercent }
  }

  const getNextStage = (trackId: string) => {
    return stages.find(s => s.trackId === trackId && s.status !== 'completed')
  }

  const getColorClass = (trackId: string) => {
    const colors: Record<string, { bg: string; border: string; accent: string }> = {
      travel: { bg: 'from-blue-50 to-cyan-50', border: 'border-blue-200', accent: 'text-blue-600' },
      drama: { bg: 'from-purple-50 to-pink-50', border: 'border-purple-200', accent: 'text-purple-600' },
      exam: { bg: 'from-red-50 to-orange-50', border: 'border-red-200', accent: 'text-red-600' },
    }
    return colors[trackId] || { bg: 'from-gray-50 to-gray-100', border: 'border-gray-200', accent: 'text-gray-600' }
  }

  return (
    <div className="page pb-32">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">我的赛道</h1>
      <p className="text-sm text-gray-500 mb-6">选择赛道开始学习</p>

      {/* 已选中的赛道（完整卡片）*/}
      <div className="space-y-4 mb-8">
        {selected.map((track) => {
          const p = progress.find((item) => item.trackId === track.id)
          const stats = getTrackStats(track.id)
          const nextStage = getNextStage(track.id)
          const colors = getColorClass(track.id)

          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card bg-gradient-to-br ${colors.bg} border-2 ${colors.border}`}
            >
              {/* 赛道标题和描述 */}
              <div className="mb-4">
                <p className="text-lg font-bold text-gray-900">
                  {track.icon} {track.name}
                </p>
                <p className="text-sm text-gray-600 mt-1">{track.description}</p>
              </div>

              {/* 进度条 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-700">进度</p>
                  <p className="text-sm font-bold text-gray-800">
                    {stats.completionPercent}% ({stats.completedStages}/{stats.totalStages} 关)
                  </p>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${colors.bg}`}
                    animate={{ width: `${stats.completionPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* 等级和 XP */}
              <div className="flex items-center justify-between text-sm mb-4 pb-4 border-b border-gray-200">
                <p className="text-gray-700">
                  <span className="font-semibold">等级：</span>Lv{p?.currentLevel ?? 1}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">经验：</span>{p?.totalXP ?? 0} XP
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  onClick={() => navigate(`/track/${track.id}`)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`py-2 px-3 rounded-lg font-semibold text-center transition ${colors.accent} bg-white border-2 ${colors.border} hover:shadow-md`}
                >
                  进入轨道
                </motion.button>
                {nextStage && (
                  <motion.button
                    onClick={() => navigate(`/stage/${nextStage.id}`)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`py-2 px-3 rounded-lg font-semibold text-center transition text-white ${colors.accent.replace('text-', 'bg-')} hover:shadow-md`}
                  >
                    继续学习
                  </motion.button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* 未选中的赛道（灰显，点击可切换）*/}
      {unselected.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">+ 添加新赛道</p>
          <div className="space-y-2">
            {unselected.map((track) => (
              <motion.button
                key={track.id}
                onClick={async () => {
                  const newSelectedTracks = [...(settings?.selectedTracks || []), track.id]
                  const userSettingsId = await db.userSettings.toCollection().primaryKeys() as number[]
                  if (userSettingsId.length > 0) {
                    await db.userSettings.update(userSettingsId[0], { selectedTracks: newSelectedTracks })
                  }
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full card bg-gray-50 border border-gray-200 hover:border-gray-300 transition opacity-60 hover:opacity-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{track.icon}</span>
                    <div className="text-left">
                      <p className="font-semibold text-gray-700">{track.name}</p>
                      <p className="text-xs text-gray-500">{track.description}</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-gray-400" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
