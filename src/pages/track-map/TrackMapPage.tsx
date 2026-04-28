import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { BookOpen, CheckCircle2, ChevronLeft, Headphones, Lock, MessageCircle, Star } from 'lucide-react'
import { db } from '../../db/db'
import { LEVEL_CONFIG } from '../../data/levels'
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
  const [selectedLevel, setSelectedLevel] = useState(1)

  const track = useLiveQuery(() => (trackId ? db.tracks.get(trackId) : undefined), [trackId])
  const trackProgress = useLiveQuery(
    () => (trackId ? db.trackProgress.get(trackId) : undefined),
    [trackId]
  )
  const chapters = useLiveQuery<Chapter[]>(async () => {
    if (!trackId) return []
    return db.chapters.where('trackId').equals(trackId).sortBy('index')
  }, [trackId])
  const stages = useLiveQuery<Stage[]>(async () => {
    if (!trackId) return []
    return db.stages.where('trackId').equals(trackId).sortBy('index')
  }, [trackId])

  // Default to the highest unlocked level (the one being actively studied)
  useEffect(() => {
    if (trackProgress?.unlockedLevels?.length) {
      setSelectedLevel(Math.max(...trackProgress.unlockedLevels))
    }
  }, [trackProgress])

  const theme = track ? trackThemes[track.id] ?? fallbackTheme : fallbackTheme

  const unlockedLevels = trackProgress?.unlockedLevels ?? [1]
  const levelProgress = trackProgress?.levelProgress ?? {}
  const isSelectedLocked = !unlockedLevels.includes(selectedLevel)

  // Filter chapters and stages by selected level
  const levelChapters = useMemo(() => {
    return (chapters ?? []).filter((ch) => ch.level === selectedLevel)
  }, [chapters, selectedLevel])

  const levelChapterIds = useMemo(() => {
    return new Set(levelChapters.map((ch) => ch.id))
  }, [levelChapters])

  const levelStages = useMemo(() => {
    return (stages ?? []).filter((st) => levelChapterIds.has(st.chapterId))
  }, [stages, levelChapterIds])

  const levelStats = useMemo(() => {
    const completed = levelStages.filter((s) => s.status === 'completed').length
    const total = levelStages.length
    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [levelStages])

  const chapterById = useMemo(() => {
    return new Map((chapters ?? []).map((ch) => [ch.id, ch]))
  }, [chapters])

  const currentStage = useMemo(() => {
    return (
      levelStages.find((s) => s.status === 'inProgress') ??
      levelStages.find((s) => s.status !== 'completed') ??
      levelStages[0]
    )
  }, [levelStages])

  const currentChapter = currentStage ? chapterById.get(currentStage.chapterId) : undefined

  // Unlock progress for the level just before selectedLevel
  const unlockInfo = useMemo(() => {
    if (!isSelectedLocked || selectedLevel <= 1) return null
    const prevLevel = selectedLevel - 1
    const meta = LEVEL_CONFIG[prevLevel]
    if (!meta) return null
    const needed = Math.ceil(meta.stageCount * 0.75)
    const prog = levelProgress[prevLevel] ?? { completed: 0, total: meta.stageCount }
    const percent = Math.min(100, Math.round((prog.completed / needed) * 100))
    return { prevLevel, needed, completed: prog.completed, percent }
  }, [isSelectedLocked, selectedLevel, levelProgress])

  const getStageIcon = (stage: Stage) => {
    if (stage.defaultMode === 'dialogue') return MessageCircle
    if (stage.defaultMode === 'scene') return Headphones
    return BookOpen
  }

  if (!track || !chapters || !stages) return null

  return (
    <div className="page pb-32 bg-white" style={{ paddingTop: 0 }}>
      {/* Sticky header */}
      <div className={`sticky top-0 z-20 -mx-4 mb-5 rounded-b-[1.75rem] bg-gradient-to-br ${theme.hero} px-4 pb-3 pt-3 text-white shadow-lg`}>
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="rounded-2xl bg-white/15 p-2.5 transition hover:bg-white/25">
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0 flex-1 px-3">
            <p className="text-xs font-black text-white/65">
              {isSelectedLocked
                ? `L${selectedLevel} · ${LEVEL_CONFIG[selectedLevel]?.name}`
                : `第 ${currentChapter?.index ?? 1} 章，第 ${currentStage?.index ?? 1} 部分`}
            </p>
            <h1 className="truncate text-xl font-black">
              {isSelectedLocked ? '尚未解锁' : (currentStage?.title ?? track.name)}
            </h1>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-2xl">
            {track.icon}
          </div>
        </div>

        {/* Level tab bar */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {[1, 2, 3, 4, 5, 6].map((lvl) => {
            const meta = LEVEL_CONFIG[lvl]
            const isUnlocked = unlockedLevels.includes(lvl)
            const isSelected = selectedLevel === lvl
            const prog = levelProgress[lvl]
            return (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  isSelected
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'bg-white/20 text-white/80 hover:bg-white/30'
                }`}
              >
                {!isUnlocked && <Lock size={10} />}
                <span>L{lvl}</span>
                <span className={isSelected ? 'text-gray-500' : 'text-white/60'}>{meta?.name}</span>
                {isUnlocked && prog && (
                  <span className={`text-[10px] ${isSelected ? 'text-gray-400' : 'text-white/50'}`}>
                    {prog.completed}/{prog.total}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Progress bar */}
        {!isSelectedLocked && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${levelStats.percent}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        )}
      </div>

      {isSelectedLocked ? (
        /* Locked level screen */
        <motion.div
          key={`locked-${selectedLevel}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12 text-center px-6"
        >
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 text-5xl">
            🔒
          </div>
          <h2 className="text-2xl font-black text-gray-900">
            L{selectedLevel} {LEVEL_CONFIG[selectedLevel]?.name}
          </h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            {LEVEL_CONFIG[selectedLevel]?.unlockCondition}
          </p>

          {unlockInfo && (
            <div className="mt-8 w-full max-w-xs rounded-2xl bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">L{unlockInfo.prevLevel} 完成进度</span>
                <span className="font-bold text-gray-900">
                  {unlockInfo.completed} / {unlockInfo.needed} 关
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                <motion.div
                  className="h-full rounded-full bg-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${unlockInfo.percent}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                还差 {Math.max(0, unlockInfo.needed - unlockInfo.completed)} 关即可解锁
              </p>
            </div>
          )}

          <button
            onClick={() => setSelectedLevel(Math.max(...unlockedLevels))}
            className="mt-6 rounded-2xl bg-gray-900 px-6 py-3 text-sm font-bold text-white"
          >
            回到当前等级
          </button>
        </motion.div>
      ) : (
        /* Stage map */
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-400">{track.name} · L{selectedLevel} {LEVEL_CONFIG[selectedLevel]?.name}</p>
              <p className="text-2xl font-black text-gray-900">闯关地图</p>
            </div>
            <div className={`rounded-2xl px-3 py-2 text-right ${theme.pill}`}>
              <p className="text-xs font-bold opacity-75">本级进度</p>
              <p className="text-lg font-black">{levelStats.completed}/{levelStats.total}</p>
            </div>
          </div>

          <div className="relative min-h-[42rem] overflow-hidden rounded-[2rem] bg-gradient-to-b from-white via-gray-50 to-white px-2 py-6">
            <div className="absolute left-8 top-48 text-6xl opacity-90">🐝</div>
            <div className="absolute right-8 top-20 h-16 w-16 rounded-full bg-amber-100 opacity-70" />
            <div className="absolute left-10 top-80 h-20 w-20 rounded-full bg-emerald-100 opacity-60" />

            <div className="relative z-10 space-y-8">
              {levelStages.map((stage, idx) => {
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
                    transition={{ delay: idx * 0.04 }}
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

                    <div className="mt-3 flex w-20 justify-center gap-1">
                      {Array.from({ length: 3 }).map((_, starIdx) => (
                        <Star
                          key={starIdx}
                          size={15}
                          className={starIdx < stage.stars ? 'text-amber-400' : 'text-gray-200'}
                          fill="currentColor"
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
        </>
      )}
    </div>
  )
}
