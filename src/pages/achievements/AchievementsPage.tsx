import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'

export default function AchievementsPage() {
  const achievements = useLiveQuery(() => db.achievements.toArray())
  if (!achievements) return null

  return (
    <div className="page pb-32">
      <h1 className="text-3xl font-bold text-brand-700 mb-2">成就墙</h1>
      <p className="text-sm text-gray-500 mb-6">解锁你的学习里程碑</p>

      <div className="grid grid-cols-2 gap-3">
        {achievements.map((item) => {
          const unlocked = Boolean(item.unlockedAt)
          return (
            <div key={item.id} className={`card ${unlocked ? '' : 'opacity-70'}`}>
              <p className="text-2xl mb-2">{item.icon}</p>
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-gray-500 mt-1">{item.description}</p>
              <p className="text-xs text-brand-600 mt-2">进度 {item.progress}%</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
