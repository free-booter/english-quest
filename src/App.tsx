import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { initializeDB } from './db/seed'

export default function App() {
  useEffect(() => {
    initializeDB().catch(console.error)
  }, [])

  return <RouterProvider router={router} />
}
