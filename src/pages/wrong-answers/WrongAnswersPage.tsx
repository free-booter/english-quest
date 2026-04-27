import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { ChevronLeft, Volume2, RotateCcw } from 'lucide-react'
import { db } from '../../db/db'
import { speak } from '../../tts/tts'

export default function WrongAnswersPage() {
  const navigate = useNavigate()
  const wrongAnswers = useLiveQuery(() =>
    db.wrongAnswers
      .orderBy('lastWrongAt')
      .reverse()
      .toArray()
  )
  const stages = useLiveQuery(() => db.stages.toArray())

  const unresolved = wrongAnswers?.filter((w) => !w.resolved) ?? []
  const resolved = wrongAnswers?.filter((w) => w.resolved) ?? []

  const handleRetry = (stageId: string) => {
    navigate(`/stage/${stageId}`)
  }

  const handleClearResolved = async () => {
    const ids = resolved.map((w) => w.id!).filter((id) => id !== undefined)
    if (ids.length > 0) {
      await db.wrongAnswers.bulkDelete(ids)
    }
  }

  const getStageName = (stageId: string): string => {
    return stages?.find((s) => s.id === stageId)?.title ?? stageId
  }

  return (
    <div className="page pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-xl transition"
        >
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-brand-700" style={{ fontFamily: 'Poppins' }}>
          错题本
        </h1>
        <div className="w-10" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 text-center">
          <p className="text-3xl font-bold text-red-600">{unresolved.length}</p>
          <p className="text-xs text-gray-600 mt-1">未掌握</p>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 text-center">
          <p className="text-3xl font-bold text-green-600">{resolved.length}</p>
          <p className="text-xs text-gray-600 mt-1">已修复</p>
        </div>
      </div>

      {/* 未掌握题目 */}
      {unresolved.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-700 mb-3">📌 待重学（{unresolved.length}）</h2>
          <div className="space-y-3">
            {unresolved.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card border-l-4 border-red-400"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">{getStageName(item.stageId)}</p>
                    <p className="text-sm font-semibold text-gray-800 mb-2">{item.questionPrompt}</p>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-red-600">你的回答：</span>
                      <span className="text-xs font-semibold text-red-600 line-through">{item.wrongOption}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-600">正确答案：</span>
                      <span className="text-sm font-bold text-green-700">{item.correctOption}</span>
                      <button
                        onClick={() => speak(item.correctOption)}
                        className="p-1 hover:bg-brand-100 rounded transition"
                      >
                        <Volume2 size={14} className="text-brand-500" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">错 {item.wrongCount} 次</div>
                </div>
                <button
                  onClick={() => handleRetry(item.stageId)}
                  className="w-full py-2 px-3 bg-brand-50 text-brand-700 text-sm font-semibold rounded-lg hover:bg-brand-100 transition flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} />
                  回到该舞台重练
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 已修复题目 */}
      {resolved.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700">✅ 已修复（{resolved.length}）</h2>
            <button
              onClick={handleClearResolved}
              className="text-xs text-gray-500 hover:text-red-500 transition"
            >
              清空
            </button>
          </div>
          <div className="space-y-2">
            {resolved.slice(0, 10).map((item) => (
              <div key={item.id} className="card border-l-4 border-green-400 opacity-70">
                <p className="text-xs text-gray-500">{getStageName(item.stageId)}</p>
                <p className="text-sm text-gray-700 mt-1">{item.questionPrompt}</p>
                <p className="text-xs text-green-700 mt-1">✓ {item.correctOption}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {unresolved.length === 0 && resolved.length === 0 && (
        <div className="card-accent text-center py-16 flex flex-col items-center justify-center">
          <span className="text-6xl mb-4">🎯</span>
          <p className="text-gray-600 text-lg font-semibold">还没有错题</p>
          <p className="text-sm text-gray-400 mt-2">继续努力学习吧 ✨</p>
        </div>
      )}
    </div>
  )
}
