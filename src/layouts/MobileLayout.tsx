import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomTabBar from '../components/BottomTabBar'
import { db } from '../db/db'

export default function MobileLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const settings = useLiveQuery(() => db.userSettings.toCollection().first())

  useEffect(() => {
    if (!settings) return
    if (!settings.onboardingDone && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true })
    }
  }, [settings, location.pathname, navigate])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  )
}
