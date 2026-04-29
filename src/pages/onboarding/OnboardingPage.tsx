import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { AVATARS, DAILY_GOALS } from '../../constants/game'

const HIDDEN_TRACKS = ['exam']

export default function OnboardingPage() {
  const navigate = useNavigate()
  const tracks = useLiveQuery(() => db.tracks.toArray())
  const settings = useLiveQuery(() => db.userSettings.toCollection().first())
  const [step, setStep] = useState(1)
  const [avatar, setAvatar] = useState<'fox' | 'cat' | 'bear' | 'penguin' | 'owl' | 'tiger'>('fox')
  const [nickname, setNickname] = useState('')
  const [selectedTrack, setSelectedTrack] = useState<string>('travel')
  const [dailyGoal, setDailyGoal] = useState<1 | 3 | 5>(3)

  const visibleTracks = useMemo(
    () => (tracks ?? []).filter((t) => !HIDDEN_TRACKS.includes(t.id)),
    [tracks]
  )

  const canNext = useMemo(() => {
    if (step === 3) return !!selectedTrack
    return true
  }, [step, selectedTrack])

  if (!tracks) return null

  const completeOnboarding = async () => {
    if (!settings?.id) {
      await db.userSettings.add({
        selectedTracks: [selectedTrack],
        primaryTrack: selectedTrack,
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
        selectedTracks: [selectedTrack],
        primaryTrack: selectedTrack,
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
          <p className="text-sm text-gray-600 mb-1">选择你感兴趣的学习主题</p>
          <p className="text-xs text-gray-400 mb-4">专注一个主题，学透场景词汇。之后可以随时切换。</p>
          {visibleTracks.map((track) => (
            <button
              key={track.id}
              onClick={() => setSelectedTrack(track.id)}
              className={`card w-full text-left transition ${
                selectedTrack === track.id
                  ? 'ring-2 ring-brand-500 bg-brand-50'
                  : 'hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{track.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900">{track.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{track.description}</p>
                </div>
                {selectedTrack === track.id && (
                  <span className="ml-auto text-brand-500 text-xl">✓</span>
                )}
              </div>
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
