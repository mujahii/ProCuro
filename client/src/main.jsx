import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

// Prompt-based SW updates: never auto-reload (avoids the focus reload loop).
// A waiting SW only takes over when the user clicks "Update".
const updateSW = registerSW({
  onNeedRefresh() {
    if (document.getElementById('pwa-update-toast')) return
    const toast = document.createElement('div')
    toast.id = 'pwa-update-toast'
    toast.style.cssText =
      'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;' +
      'background:#083A4F;color:#fff;padding:10px 14px;border-radius:10px;display:flex;' +
      'gap:12px;align-items:center;font:14px system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)'
    const label = document.createElement('span')
    label.textContent = 'A new version is available.'
    const btn = document.createElement('button')
    btn.textContent = 'Update'
    btn.style.cssText =
      'background:#fff;color:#083A4F;border:none;border-radius:8px;padding:6px 12px;' +
      'font-weight:600;cursor:pointer'
    btn.onclick = () => updateSW(true)
    toast.append(label, btn)
    document.body.appendChild(toast)
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
