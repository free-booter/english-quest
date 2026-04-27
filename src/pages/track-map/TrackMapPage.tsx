import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { BookOpen, CheckCircle2, ChevronLeft, Headphones, Lock, MessageCircle, Star } from 'lucide-react'
import { db } from '../../db/db'
import { Chapter, Stage } from '../../types'

const trackThemes: Record<string, {
  hero: string
  soft: string
  accent: string
  node: string
  pill: string
  button: string
}> = {
  travel: {
    hero: 'from-blue-500 via-cyan-500 to-sky-400',
    soft: 'from-blue-50 to-cyan-50',
    accent: 'text-blue-600',
    node: 'bg-blue-500',
    pill: 'bg-blue-100 text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  drama: {
    hero: 'from-purple-500 via-fuchsia-500 to-pink-500',
    soft: 'from-purple-50 to-pink-50',
    accent: 'text-purple-600',
    node: 'bg-purple-500',
    pill: 'bg-purple-100 text-purple-700',
    button: 'bg-purple-600 hover:bg-purple-700',
  },
  exam: {
    hero: 'from-red-500 via-orange-500 to-amber-400',
    soft: 'from-red-50 to-orange-50',
    accent: 'text-red-600',
    node: 'bg-red-500',
    pill: 'bg-red-100 text-red-700',
    button: 'bg-red-600 hover:bg-red-700',
  },
}

const fallbackTheme = {
  hero: 'from-emerald-500 via-teal-500 to-cyan-400',
  soft: 'from-emerald-50 to-teal-50',
  accent: 'text-emerald-600',
  node: 'bg-emerald-500',
  pill: 'bg-emerald-100 text-emerald-700',
  button: 'bg-emerald-600 hover:bg-emerald-700',
}

const nodePositions = [
  'ml-[58%]',
  'ml-[33%]',
  'ml-[54%]',
  'ml-[23%]',
  'ml-[48%]',
  'ml-[66%]',
  'ml-[38%]',
  'ml-[55%]',
]

export default function TrackMapPage() {
  const navigate = useNavigate()
  const { trackId } = useParams<{ trackId: string }>()
  const track = useLiveQuery(() => (trackId ? db.tracks.get(trackId) : undefined), [trackId])
  const chapters = useLiveQuery<Chapter[]>(async () => {
    if (!trackId) return []
    return db.chapters.where('trackId').equals(trackId).sortBy('index')
  }, [trackId])
  const stages = useLiveQuery<Stage[]>(async () => {
    if (!trackId) return []
    return db.stages.where('trackId').equals(trackId).sortBy('index')
  }, [trackId])

  const theme = track ? trackThemes[track.id] ?? fallbackTheme : fallbackTheme

  const trackStats = useMemo(() => {
    const list = stages ?? []
    const completed = list.filter((stage) => stage.status === 'completed').length
    const totalStars = list.reduce((sum, stage) => sum + (stage.stars ?? 0), 0)
    return {
      completed,
      total: list.length,
      percent: list.length > 0 ? Math.round((completed / list.length) * 100) : 0,
      stars: totalStars,
    }
  }, [stages])

  const chapterById = useMemo(() => {
    return new Map((chapters ?? []).map((chapter) => [chapter.id, chapter]))
  }, [chapters])

  const currentStage = useMemo(() => {
    return stages?.find((stage) => stage.status === 'inProgress') ?? stages?.find((stage) => stage.status !== 'completed') ?? stages?.[0]
  }, [stages])

  const currentChapter = currentStage ? chapterById.get(currentStage.chapterId) : undefined

  const getStageIcon = (stage: Stage) => {
    if (stage.defaultMode === 'dialogue') return MessageCircle
    if (stage.defaultMode === 'scene') return Headphones
    return BookOpen
  }

  if (!track || !chapters || !stages) return null

  return (
    <div className="page pb-32 bg-white" style={{ paddingTop: 0 }}>
      <div className={`sticky top-0 z-20 -mx-4 mb-5 rounded-b-[1.75rem] bg-gradient-to-br ${theme.hero} px-4 pb-4 pt-3 text-white shadow-lg`}>
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="rounded-2xl bg-white/15 p-2.5 transition hover:bg-white/25">
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0 flex-1 px-3">
            <p className="text-xs font-black text-white/65">
              第 {currentChapter?.index ?? 1} 章，第 {currentStage?.index ?? 1} 部分
            </p>
            <h1 className="truncate text-xl font-black">{currentStage?.title ?? track.name}</h1>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-2xl">
            {track.icon}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
          <motion.div
            className="h-full rounded-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${trackStats.percent}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-400">{track.name}</p>
          <p className="text-2xl font-black text-gray-900">闯关地图</p>
        </div>
        <div className={`rounded-2xl px-3 py-2 text-right ${theme.pill}`}>
          <p className="text-xs font-bold opacity-75">总进度</p>
          <p className="text-lg font-black">{trackStats.completed}/{trackStats.total}</p>
        </div>
      </div>

      <div className="relative min-h-[42rem] overflow-hidden rounded-[2rem] bg-gradient-to-b from-white via-gray-50 to-white px-2 py-6">
        <div className="absolute left-8 top-48 text-6xl opacity-90">🐝</div>
        <div className="absolute right-8 top-20 h-16 w-16 rounded-full bg-amber-100 opacity-70" />
        <div className="absolute left-10 top-80 h-20 w-20 rounded-full bg-emerald-100 opacity-60" />

        <div className="relative z-10 space-y-8">
          {stages.map((stage, idx) => {
            const chapter = chapterById.get(stage.chapterId)
            const StageIcon = getStageIcon(stage)
            const isLocked = stage.status === 'locked'
            const isCompleted = stage.status === 'completed'
            const isCurrent = stage.id === currentStage?.id && !isCompleted && !isLocked
            const position = nodePositions[idx % nodePositions.length]

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`relative w-24 ${position}`}
              >
                <button
                  onClick={() => {
                    if (!isLocked) navigate(`/stage/${stage.id}`)
                  }}
                  disabled={isLocked}
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full border-[5px] text-white transition active:translate-y-1 ${
                    isCompleted
                      ? 'border-emerald-200 bg-emerald-500 shadow-[0_8px_0_#059669]'
                      : isLocked
                        ? 'border-gray-100 bg-gray-200 text-gray-400 shadow-[0_8px_0_#cbd5e1]'
                        : `${theme.node} border-emerald-100 shadow-[0_8px_0_#059669]`
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={34} />
                  ) : isLocked ? (
                    <Lock size={30} />
                  ) : (
                    <StageIcon size={34} strokeWidth={3} />
                  )}
                  {isCurrent && (
                    <span className="absolute -bottom-2 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-white shadow-sm">
                      当前
                    </span>
                  )}
                </button>

                <div className="mt-3 flex w-20 justify-center gap-1 text-gray-200">
                  {Array.from({ length: 3 }).map((_, starIdx) => (
                    <Star
                      key={starIdx}
                      size={15}
                      className={starIdx < stage.stars ? 'text-amber-400' : 'text-gray-200'}
                      fill={starIdx < stage.stars ? 'currentColor' : 'currentColor'}
                    />
                  ))}
                </div>

                {(isCurrent || idx === 0) && (
                  <div className="absolute left-1/2 top-full mt-8 w-44 -translate-x-1/2 rounded-2xl bg-white p-3 text-center shadow-lg">
                    <p className="text-xs font-bold text-gray-400">第 {chapter?.index ?? idx + 1} 章</p>
                    <p className="mt-0.5 text-sm font-black text-gray-900">{stage.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{stage.theme}</p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
