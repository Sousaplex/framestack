import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { electronAPI } from './api'

// Expose the API on window for backward compatibility with existing components
;(window as any).electronAPI = electronAPI

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
