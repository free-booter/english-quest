import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Map, Headphones, Mic2, User } from 'lucide-react'

const tabs = [
  { path: '/', label: '首页', icon: Home },
  { path: '/tracks', label: '主题', icon: Map },
  { path: '/listening', label: '听力', icon: Headphones },
  { path: '/speaking', label: '口语', icon: Mic2 },
  { path: '/me', label: '我的', icon: User },
]

export default function BottomTabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname

  const isTabActive = (path: string) => {
    if (path === '/') return currentPath === '/'
    if (path === '/tracks') {
      return (
        currentPath.startsWith('/tracks') ||
        currentPath.startsWith('/track/') ||
        currentPath.startsWith('/chapter/') ||
        currentPath.startsWith('/stage/')
      )
    }
    return currentPath.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-screen-sm mx-auto bg-white border-t border-gray-100">
      <div className="flex justify-around items-center h-16 px-1">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = isTabActive(path)
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
            >
              <Icon
                size={22}
                className={isActive ? 'text-brand-500' : 'text-gray-400'}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-brand-500' : 'text-gray-400'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
