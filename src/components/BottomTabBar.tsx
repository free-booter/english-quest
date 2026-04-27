import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Map, Headphones, Mic2, User } from 'lucide-react'
import { useState } from 'react'

const tabs = [
  { path: '/', label: '首页', icon: Home },
  { path: '/tracks', label: '赛道', icon: Map },
  { path: '/listening', label: '听力', icon: Headphones },
  { path: '/speaking', label: '口语', icon: Mic2 },
  { path: '/me', label: '我的', icon: User },
]

export default function BottomTabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)

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
    <nav className="fixed bottom-0 left-0 right-0 max-w-screen-sm mx-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-xl border-t border-white/50" />

      {/* Content */}
      <div className="relative flex justify-around items-center h-20 px-2">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = isTabActive(path)
          const isHovered = hoveredPath === path

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              onMouseEnter={() => setHoveredPath(path)}
              onMouseLeave={() => setHoveredPath(null)}
              className="relative flex flex-col items-center justify-center flex-1 h-20 group transition-all duration-200"
            >
              {/* Active indicator background */}
              {isActive && (
                <div className="absolute inset-0 bg-brand-500/10 rounded-2xl" />
              )}

              {/* Icon container */}
              <div className={`relative z-10 transition-all duration-200 ${
                isActive
                  ? 'text-brand-500 scale-110'
                  : isHovered
                  ? 'text-brand-400 scale-105'
                  : 'text-gray-400 scale-100'
              }`}>
                <Icon
                  size={isActive ? 28 : 24}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>

              {/* Label */}
              <span className={`text-xs mt-1 font-medium transition-all duration-200 ${
                isActive
                  ? 'text-brand-600'
                  : 'text-gray-500'
              }`}>
                {label}
              </span>

              {/* Active dot */}
              {isActive && (
                <div className="absolute bottom-0 w-1 h-1 bg-brand-500 rounded-full animate-pulse" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
