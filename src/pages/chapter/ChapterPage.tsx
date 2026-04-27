import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'

export default function ChapterPage() {
  const navigate = useNavigate()
  const { chapterId } = useParams<{ chapterId: string }>()
  const chapter = useLiveQuery(() => (chapterId ? db.chapters.get(chapterId) : undefined), [chapterId])
  const stages = useLiveQuery(
    async () => {
      if (!chapter?.stageIds?.length) return []
      return db.stages.where('id').anyOf(chapter.stageIds).sortBy('index')
    },
    [chapter]
  )

  if (!chapter || !stages) return null

  return (
    <div className="page pb-32">
      <h1 className="text-3xl font-bold mb-1">{chapter.scenarioImage} {chapter.title}</h1>
      <p className="text-sm text-gray-500 mb-6">{chapter.scenario}</p>

      <div className="space-y-3">
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => navigate(`/stage/${stage.id}`)}
            disabled={stage.status === 'locked'}
            className="card w-full text-left disabled:opacity-50"
          >
            <p className="font-semibold">{stage.title}</p>
            <p className="text-xs text-gray-500 mt-1">{stage.theme}</p>
            <p className="text-xs mt-2 text-brand-600">
              {stage.status === 'completed' ? '已完成' : stage.status === 'inProgress' ? '进行中' : '未解锁'}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
