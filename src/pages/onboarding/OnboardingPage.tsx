import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { AVATARS, DAILY_GOALS } from '../../constants/game'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const tracks = useLiveQuery(() => db.tracks.toArray())
  const settings = useLiveQuery(() => db.userSettings.toCollection().first())
  const [step, setStep] = useState(1)
  const [avatar, setAvatar] = useState<'fox' | 'cat' | 'bear' | 'penguin' | 'owl' | 'tiger'>('fox')
  const [nickname, setNickname] = useState('')
  const [selectedTracks, setSelectedTracks] = useState<string[]>(['travel'])
  const [dailyGoal, setDailyGoal] = useState<1 | 3 | 5>(3)

  const canNext = useMemo(() => {
    if (step === 3) return selectedTracks.length > 0 && selectedTracks.length <= 3
    return true
  }, [step, selectedTracks.length])

  if (!tracks) return null

  const toggleTrack = (trackId: string) => {
    setSelectedTracks((prev) => {
      if (prev.includes(trackId)) return prev.filter((id) => id !== trackId)
      if (prev.length >= 3) return prev
      return [...prev, trackId]
    })
  }

  const completeOnboarding = async () => {
    const chosenPrimary = selectedTracks[0] ?? tracks[0]?.id ?? 'travel'
    if (!settings?.id) {
      await db.userSettings.add({
        selectedTracks,
        primaryTrack: chosenPrimary,
        avatar,
        nickname: nickname.trim() || '冒险者',
        totalXP: 0,
        totalLevel: 1,
        dailyGoal,
        ttsRate: 1,
        theme: 'auto',
        onboardingDone: true,
        createdAt: Date.now(),
      })
    } else {
      await db.userSettings.update(settings.id, {
        selectedTracks,
        primaryTrack: chosenPrimary,
        avatar,
        nickname: nickname.trim() || '冒险者',
        dailyGoal,
        onboardingDone: true,
      })
    }
    navigate('/')
  }

  return (
    <div className="page pb-32">
      <h1 className="text-3xl font-bold text-brand-700 mb-2">欢迎来到 English Quest</h1>
      <p className="text-sm text-gray-500 mb-6">第 {step} / 4 步</p>

      {step === 1 && (
        <div className="grid grid-cols-3 gap-3">
          {AVATARS.map((item) => (
            <button
              key={item.id}
              onClick={() => setAvatar(item.id)}
              className={`card text-center py-6 ${avatar === item.id ? 'ring-2 ring-brand-500 bg-brand-50' : ''}`}
            >
              <div className="text-3xl">{item.icon}</div>
              <p className="text-xs text-gray-600 mt-2">{item.label}</p>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <p className="text-sm text-gray-600 mb-3">给自己起个昵称（可跳过）</p>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="例如：旅行词汇达人"
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">选择 1-3 条赛道</p>
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => toggleTrack(track.id)}
              className={`card w-full text-left ${selectedTracks.includes(track.id) ? 'ring-2 ring-brand-500' : ''}`}
            >
              <p className="font-semibold">{track.icon} {track.name}</p>
              <p className="text-xs text-gray-500 mt-1">{track.description}</p>
            </button>
          ))}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">设置每日目标关卡数</p>
          <div className="grid grid-cols-3 gap-3">
            {DAILY_GOALS.map((goal) => (
              <button
                key={goal}
                onClick={() => setDailyGoal(goal)}
                className={`card py-5 text-center font-semibold ${dailyGoal === goal ? 'ring-2 ring-brand-500 text-brand-700' : ''}`}
              >
                {goal} 关
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <button
          disabled={step === 1}
          onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          className="flex-1 btn-ghost py-3 disabled:opacity-50"
        >
          上一步
        </button>
        {step < 4 ? (
          <button
            disabled={!canNext}
            onClick={() => setStep((prev) => Math.min(4, prev + 1))}
            className="flex-1 btn-primary py-3 disabled:opacity-50"
          >
            下一步
          </button>
        ) : (
          <button onClick={completeOnboarding} className="flex-1 btn-primary py-3">
            完成并开始学习
          </button>
        )}
      </div>
    </div>
  )
}
