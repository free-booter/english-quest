import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft } from 'lucide-react'
import { db } from '../../db/db'

export default function VocabularyPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [trackFilter, setTrackFilter] = useState<string>('all')

  const tracks = useLiveQuery(() => db.tracks.toArray())
  const learnedWordIds = useLiveQuery(async () => {
    const reviews = await db.reviews.toArray()
    return new Set(reviews.map((item) => item.wordId))
  })
  const words = useLiveQuery(() => db.words.toArray())

  const addToTodayReview = async (wordId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const existing = await db.reviews.where('wordId').equals(wordId).first()
    if (existing) {
      await db.reviews.update(wordId, { nextReviewDate: today })
      return
    }
    await db.reviews.add({
      wordId,
      nextReviewDate: today,
      intervalDay: 1,
      failCount: 0,
    })
  }

  const learnedWords = useMemo(() => {
    if (!words || !learnedWordIds) return []
    const list = words.filter((word) => learnedWordIds.has(word.id))
    return list
      .filter((word) => (trackFilter === 'all' ? true : word.trackTags.includes(trackFilter)))
      .filter((word) => {
        if (!query.trim()) return true
        const keyword = query.trim().toLowerCase()
        return word.word.toLowerCase().includes(keyword) || word.meaning.toLowerCase().includes(keyword)
      })
      .sort((a, b) => b.mastery - a.mastery || a.word.localeCompare(b.word))
  }, [words, learnedWordIds, query, trackFilter])

  const groupedWords = useMemo(() => {
    return {
      weak: learnedWords.filter((word) => word.mastery <= 1),
      growing: learnedWords.filter((word) => word.mastery >= 2 && word.mastery <= 3),
      strong: learnedWords.filter((word) => word.mastery >= 4),
    }
  }, [learnedWords])

  return (
    <div className="page pb-32">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition">
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-brand-700">我的单词本</h1>
        <div className="w-10" />
      </div>

      <div className="card mb-4 border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
        <p className="text-xs text-gray-600 mb-1">学习档案</p>
        <p className="text-2xl font-bold text-emerald-700">{learnedWords.length}</p>
        <p className="text-xs text-gray-500 mt-1">累计进入学习闭环的词汇</p>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索单词或中文释义"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 mb-3 outline-none focus:ring-2 focus:ring-brand-300"
      />

      <div className="flex gap-2 overflow-x-auto mb-4">
        <button
          onClick={() => setTrackFilter('all')}
          className={`px-3 py-2 rounded-xl text-sm whitespace-nowrap ${trackFilter === 'all' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          全部
        </button>
        {(tracks ?? []).map((track) => (
          <button
            key={track.id}
            onClick={() => setTrackFilter(track.id)}
            className={`px-3 py-2 rounded-xl text-sm whitespace-nowrap ${trackFilter === track.id ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {track.icon} {track.name}
          </button>
        ))}
      </div>

      {learnedWords.length === 0 && (
        <div className="card text-center py-10 text-gray-500">
          还没有已学词汇，先去完成一个关卡吧。
        </div>
      )}

      {([
        { key: 'weak', title: '待加强（0-1）', data: groupedWords.weak },
        { key: 'growing', title: '学习中（2-3）', data: groupedWords.growing },
        { key: 'strong', title: '已掌握（4-5）', data: groupedWords.strong },
      ] as const).map((group) => (
        <div key={group.key} className="mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">{group.title} · {group.data.length}</p>
          <div className="space-y-3">
            {group.data.map((word) => (
              <div key={word.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{word.word}</p>
                    <p className="text-xs text-gray-500 mt-1">{word.phonetic || word.pos}</p>
                  </div>
                  <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded-full">
                    掌握度 {word.mastery}/5
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-3">{word.meaning}</p>
                {word.examples?.[0] && (
                  <p className="text-xs text-gray-500 mt-2">{word.examples[0].en}</p>
                )}
                <button
                  onClick={() => addToTodayReview(word.id)}
                  className="mt-3 px-3 py-1.5 text-xs rounded-lg bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100 transition"
                >
                  加入今日复习
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
