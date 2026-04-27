import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'virtual:uno.css'
import '@unocss/reset/tailwind-compat.css'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
