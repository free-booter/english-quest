import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { db } from '../../db/db'
import CardStage from './CardStage'
import DialogueStage from './DialogueStage'
import SceneStage from './SceneStage'

export default function StagePage() {
  const { stageId } = useParams<{ stageId: string }>()
  const navigate = useNavigate()
  const stage = useLiveQuery(() => (stageId ? db.stages.get(stageId) : undefined))
  const chapter = useLiveQuery(() => (stage ? db.chapters.get(stage.chapterId) : undefined), [stage])
  const track = useLiveQuery(() => (stage ? db.tracks.get(stage.trackId) : undefined), [stage])

  const [currentMode, setCurrentMode] = useState<'card' | 'dialogue' | 'scene' | null>(null)

  type StageMode = 'card' | 'dialogue' | 'scene'
  const visibleModes: StageMode[] = ((stage?.modes || ['card']) as StageMode[]).filter((mode) => mode !== 'scene')
  const stageDefaultMode = (stage?.defaultMode ?? 'card') as StageMode
  const fallbackMode: StageMode = visibleModes.includes(stageDefaultMode) ? stageDefaultMode : 'card'
  const activeMode: StageMode = currentMode || fallbackMode || 'card'
  const availableModes: StageMode[] = visibleModes.length > 0 ? visibleModes : ['card']

  const handleModeSwitch = (mode: 'card' | 'dialogue' | 'scene') => {
    if (availableModes.includes(mode)) {
      setCurrentMode(mode)
    }
  }

  const handleComplete = () => {
    navigate('/tracks')
  }

  const getModeName = (mode: 'card' | 'dialogue' | 'scene') => {
    const names = { card: '学习', dialogue: '对话', scene: '场景' }
    return names[mode]
  }

  if (!stage) {
    return (
      <div className="page pb-32">
        <p className="text-gray-500">关卡加载中...</p>
      </div>
    )
  }

  if (stage.status === 'locked') {
    return (
      <div className="page pb-32">
        <div className="card text-center py-10">
          <p className="text-2xl mb-3">🔒</p>
          <p className="font-semibold text-gray-800 mb-1">该关卡尚未解锁</p>
          <p className="text-sm text-gray-500 mb-4">请先完成前置关卡后再进入。</p>
          <button onClick={() => navigate('/tracks')} className="btn-primary px-4 py-2 rounded-xl">
            返回赛道页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="page pb-32"
      style={{
        background: `linear-gradient(160deg, ${track?.color ?? '#3b82f6'}15, #ffffff 45%)`,
      }}
    >
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate('/tracks')}
          className="p-2 hover:bg-white rounded-xl transition shadow-sm"
        >
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-lg font-bold text-brand-700" style={{ fontFamily: 'Poppins' }}>
            {track?.icon} {chapter?.title ?? '章节'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{stage.title}</p>
        </div>
        <div className="w-10" />
      </div>

      {/* 模式切换 - 仅在多模式时显示 */}
      {availableModes.length > 1 && (
        <motion.div className={`mb-4 p-1 rounded-2xl bg-white/80 border border-gray-100 grid gap-1 ${availableModes.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {availableModes.map((mode) => (
            <motion.button
              key={mode}
              onClick={() => handleModeSwitch(mode)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-3 py-2 rounded-xl font-semibold transition text-sm ${
                activeMode === mode
                  ? 'bg-brand-500 text-white shadow'
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              {getModeName(mode)}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* 模式内容 */}
      <motion.div
        key={activeMode}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        {activeMode === 'dialogue' && <DialogueStage />}
        {activeMode === 'scene' && <SceneStage />}
        {activeMode === 'card' && <CardStage onComplete={handleComplete} />}
      </motion.div>
    </div>
  )
}
