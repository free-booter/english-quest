import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Star, BookOpen, Target, Zap, Clock, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { db } from '../../db/db'

export default function TracksPage() {
  const navigate = useNavigate()
  const tracks = useLiveQuery(() => db.tracks.toArray())
  const settings = useLiveQuery(() => db.userSettings.toCollection().first())
  const progress = useLiveQuery(() => db.trackProgress.toArray())
  const stages = useLiveQuery(() => db.stages.toArray())
  const chapters = useLiveQuery(() => db.chapters.toArray())
  const words = useLiveQuery(() => db.words.toArray())

  if (!tracks || !settings || !progress || !stages || !chapters || !words) return null

  const selected = tracks.filter((track) => settings.selectedTracks.includes(track.id))
  const unselected = tracks.filter((track) => !settings.selectedTracks.includes(track.id))

  const getTrackData = (trackId: string) => {
    const trackStages = stages.filter((s) => s.trackId === trackId)
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

    const avgStars =
      completedStages.length > 0
        ? Math.round((completedStages.reduce((sum, s) => sum + (s.stars ?? 0), 0) / completedStages.length) * 10) / 10
        : 0

    const trackWords = words.filter((w) => w.trackTags.includes(trackId))
    const learnedWords = trackWords.filter((w) => w.mastery >= 1).length

    return {
      completedStages: completedStages.length,
      totalStages,
      completionPercent,
      nextStage,
      nextChapter,
      previewWords,
      avgStars,
      learnedWords,
      totalWords: trackWords.length,
    }
  }

  const getColorClass = (trackId: string) => {
    const colors: Record<string, { bg: string; border: string; accent: string; progress: string }> = {
      travel: {
        bg: 'from-blue-50 to-cyan-50',
        border: 'border-blue-200',
        accent: 'text-blue-600',
        progress: 'bg-blue-500',
      },
      drama: {
        bg: 'from-purple-50 to-pink-50',
        border: 'border-purple-200',
        accent: 'text-purple-600',
        progress: 'bg-purple-500',
      },
      exam: {
        bg: 'from-red-50 to-orange-50',
        border: 'border-red-200',
        accent: 'text-red-600',
        progress: 'bg-red-500',
      },
    }
    return (
      colors[trackId] || {
        bg: 'from-gray-50 to-gray-100',
        border: 'border-gray-200',
        accent: 'text-gray-600',
        progress: 'bg-gray-500',
      }
    )
  }

  return (
    <div className="page pb-32">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">学习赛道</h1>
      <p className="text-sm text-gray-500 mb-6">选择赛道，多种练习模式任你选</p>

      {/* 已选中的赛道 */}
      <div className="space-y-5 mb-8">
        {selected.map((track) => {
          const p = progress.find((item) => item.trackId === track.id)
          const data = getTrackData(track.id)
          const colors = getColorClass(track.id)
          const isPrimary = settings.primaryTrack === track.id
          const isCompleted = data.completionPercent === 100

          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card bg-gradient-to-br ${colors.bg} border-2 ${colors.border} ${isPrimary ? 'ring-2 ring-brand-400 ring-offset-2' : ''}`}
            >
              {/* 标题行 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{track.icon}</span>
                    <h2 className="text-lg font-bold text-gray-900">{track.name}</h2>
                    {isPrimary && (
                      <span className="px-2 py-0.5 bg-brand-500 text-white text-xs font-bold rounded-full">主</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{track.description}</p>
                </div>
              </div>

              {/* 进度信息 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">学习进度</span>
                  <span className="text-sm font-bold text-gray-800">
                    {data.completionPercent}%
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      ({data.completedStages}/{data.totalStages} 关)
                    </span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${colors.progress} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${data.completionPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* 统计数据 */}
              <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-200/60">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                    <Target size={14} />
                    <span className="text-xs">等级</span>
                  </div>
                  <p className="text-lg font-bold text-gray-800">Lv{p?.currentLevel ?? 1}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                    <BookOpen size={14} />
                    <span className="text-xs">词汇</span>
                  </div>
                  <p className="text-lg font-bold text-gray-800">
                    {data.learnedWords}
                    <span className="text-xs font-normal text-gray-500">/{data.totalWords}</span>
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                    <Star size={14} />
                    <span className="text-xs">星级</span>
                  </div>
                  <p className="text-lg font-bold text-amber-500">
                    {data.avgStars > 0 ? `${data.avgStars}` : '-'}
                  </p>
                </div>
              </div>

              {/* 练习模式入口 */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">练习模式</p>
                <div className="grid grid-cols-3 gap-2">
                  <motion.button
                    onClick={() => navigate(`/quick-quiz/${track.id}`)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="p-3 bg-white rounded-xl border border-gray-200 hover:border-brand-300 transition text-center"
                  >
                    <Zap size={20} className="mx-auto mb-1 text-amber-500" />
                    <p className="text-xs font-semibold text-gray-700">快速刷词</p>
                  </motion.button>

                  <motion.button
                    onClick={() => navigate(`/challenge/${track.id}`)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="p-3 bg-white rounded-xl border border-gray-200 hover:border-brand-300 transition text-center"
                  >
                    <Clock size={20} className="mx-auto mb-1 text-red-500" />
                    <p className="text-xs font-semibold text-gray-700">限时挑战</p>
                  </motion.button>

                  <motion.button
                    onClick={() => navigate(`/dialogue/${track.id}`)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="p-3 bg-white rounded-xl border border-gray-200 hover:border-brand-300 transition text-center"
                  >
                    <MessageCircle size={20} className="mx-auto mb-1 text-purple-500" />
                    <p className="text-xs font-semibold text-gray-700">对话练习</p>
                  </motion.button>
                </div>
              </div>

              {/* 下一关预览 */}
              {data.nextStage && data.nextChapter ? (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">下一关</p>
                  <div className="bg-white/60 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{data.nextStage.title}</p>
                        <p className="text-xs text-gray-500">
                          {data.nextChapter.title} · {data.nextStage.theme}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">{data.nextStage.wordIds.length} 词</span>
                    </div>
                    {data.previewWords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {data.previewWords.map((w) => (
                          <span
                            key={w.id}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {w.word}
                          </span>
                        ))}
                        {data.nextStage.wordIds.length > 3 && (
                          <span className="px-2 py-0.5 text-gray-400 text-xs">
                            +{data.nextStage.wordIds.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : isCompleted ? (
                <div className="mb-4 bg-green-50 rounded-xl p-3 text-center">
                  <span className="text-green-600 font-semibold">🎉 已完成全部关卡</span>
                </div>
              ) : null}

              {/* 操作按钮 */}
              <div className="flex gap-3">
                {data.nextStage ? (
                  <motion.button
                    onClick={() => navigate(`/stage/${data.nextStage!.id}`)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold text-white ${colors.progress} hover:shadow-lg transition flex items-center justify-center gap-2`}
                  >
                    继续学习
                    <ChevronRight size={18} />
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={() => navigate(`/track/${track.id}`)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-green-500 hover:shadow-lg transition"
                  >
                    查看成绩
                  </motion.button>
                )}
                <motion.button
                  onClick={() => navigate(`/track/${track.id}`)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`py-3 px-4 rounded-xl font-semibold ${colors.accent} bg-white border-2 ${colors.border} hover:shadow-md transition`}
                >
                  全部关卡
                </motion.button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* 未选中的赛道 */}
      {unselected.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">添加新赛道</p>
          <div className="space-y-2">
            {unselected.map((track) => (
              <motion.button
                key={track.id}
                onClick={async () => {
                  const newSelectedTracks = [...(settings?.selectedTracks || []), track.id]
                  const userSettingsId = (await db.userSettings.toCollection().primaryKeys()) as number[]
                  if (userSettingsId.length > 0) {
                    await db.userSettings.update(userSettingsId[0], { selectedTracks: newSelectedTracks })
                  }
                }}
                whileHover={{ scale: 1.01, opacity: 1 }}
                whileTap={{ scale: 0.99 }}
                className="w-full card bg-gray-50 border border-dashed border-gray-300 hover:border-gray-400 transition opacity-70 hover:opacity-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{track.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-700">{track.name}</p>
                    <p className="text-xs text-gray-500">{track.description}</p>
                  </div>
                  <span className="text-xs text-brand-500 font-medium">+ 添加</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
