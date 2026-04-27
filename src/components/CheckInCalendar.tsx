import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { db } from '../db/db'

export default function CheckInCalendar() {
  const checkIns = useLiveQuery(() => db.checkIns.toArray())

  if (!checkIns) return null

  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  // Get calendar days for current month
  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const days: (number | null)[] = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  // Calculate check-in intensity for each day
  const checkInMap = new Map<string, number>()
  checkIns.forEach((checkIn) => {
    checkInMap.set(checkIn.date, checkIn.wordsLearned)
  })

  const getIntensity = (day: number | null): number => {
    if (!day) return 0
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return Math.min(4, Math.ceil((checkInMap.get(dateStr) || 0) / 10))
  }

  const getColor = (intensity: number): string => {
    const colors = [
      'bg-gray-100',
      'bg-brand-200',
      'bg-brand-400',
      'bg-brand-600',
      'bg-brand-700',
    ]
    return colors[intensity] || colors[0]
  }

  // Calculate streak
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    if (checkInMap.has(dateStr)) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  return (
    <div className="card">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700">打卡日历</h3>
          {streak > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-brand-600">{streak}</p>
              <p className="text-xs text-gray-500">天连续打卡 🔥</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-4">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
              {day}
            </div>
          ))}

          {days.map((day, idx) => {
            const intensity = getIntensity(day)
            const isToday =
              day !== null &&
              day === today.getDate() &&
              currentMonth === today.getMonth() &&
              currentYear === today.getFullYear()

            return (
              <motion.div
                key={idx}
                whileHover={day ? { scale: 1.1 } : {}}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold ${getColor(intensity)} ${
                  isToday ? 'ring-2 ring-brand-500' : ''
                } ${day ? 'cursor-default' : ''}`}
              >
                {day}
              </motion.div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-100" />
            <span>0词</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-brand-200" />
            <span>1-10</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-brand-400" />
            <span>11-20</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-brand-600" />
            <span>20+</span>
          </div>
        </div>
      </div>
    </div>
  )
}
