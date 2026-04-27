import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import ReactFlow, { Background, Controls, Edge, Node } from 'reactflow'
import 'reactflow/dist/style.css'
import { db } from '../../db/db'
import { Chapter } from '../../types'

const levelColors: Record<number, string> = {
  1: '#93c5fd',
  2: '#60a5fa',
  3: '#3b82f6',
  4: '#2563eb',
  5: '#1d4ed8',
}

export default function TrackMapPage() {
  const navigate = useNavigate()
  const { trackId } = useParams<{ trackId: string }>()
  const track = useLiveQuery(() => (trackId ? db.tracks.get(trackId) : undefined), [trackId])
  const chapters = useLiveQuery<Chapter[]>(async () => {
    if (!trackId) return []
    return db.chapters.where('trackId').equals(trackId).sortBy('index')
  }, [trackId])

  const nodes = useMemo<Node[]>(() => {
    if (!chapters) return []
    return chapters.map((chapter, idx) => ({
      id: chapter.id,
      position: { x: idx % 2 === 0 ? 40 : 220, y: idx * 120 },
      data: { label: `${chapter.scenarioImage ?? '📖'} ${chapter.title}` },
      style: {
        borderRadius: 16,
        border: `2px solid ${levelColors[chapter.level]}`,
        width: 180,
        background: '#fff',
      },
    }))
  }, [chapters])

  const edges = useMemo<Edge[]>(() => {
    if (!chapters || chapters.length < 2) return []
    return chapters.slice(0, -1).map((chapter, idx) => ({
      id: `e-${chapter.id}`,
      source: chapter.id,
      target: chapters[idx + 1].id,
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    }))
  }, [chapters])

  if (!track || !chapters) return null

  return (
    <div className="page pb-32 h-screen flex flex-col">
      <h1 className="text-3xl font-bold mb-2">{track.icon} {track.name}</h1>
      <p className="text-sm text-gray-500 mb-4">章节地图（按等级分组）</p>
      <div className="flex-1 rounded-2xl border border-gray-200 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          onNodeClick={(_, node) => navigate(`/chapter/${node.id}`)}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}
