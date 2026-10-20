import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SkinProvider } from './skins/SkinContext'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SkinProvider>
      <App />
    </SkinProvider>
  </React.StrictMode>,
)
