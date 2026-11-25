import { useEffect, useState, type FC, type ReactNode, createContext, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ConnectivityStatus } from './ConnectivityStatus'
import { ModeToggle, SkinMenu } from './SkinControls'
import { useConnectivity } from '../hooks/useConnectivity'

const ROUTE_META: Record<string, { title: string; badge?: string }> = {
  '/':                { title: 'Home' },
  '/dashboard':       { title: 'Dashboard' },
  '/environments':    { title: 'Environments',   badge: 'Environment'   },
  '/builds':          { title: 'Builds',         badge: 'Build'         },
  '/packages':        { title: 'Packages',       badge: 'Package'       },
  '/serviceunits':    { title: 'Service Units',  badge: 'ServiceUnit'   },
  '/deployments':     { title: 'Deployments',    badge: 'Deployment'    },
  '/gitrepositories': { title: 'Git Repositories', badge: 'GitRepository' },
  '/githubevents':    { title: 'GitHub Events',  badge: 'GitHubEvent'   },
  '/routes':          { title: 'Routes',         badge: 'Route'         },
  '/domains':         { title: 'Domains',        badge: 'Domain'        },
  '/logs':            { title: 'Logs',          badge: 'Logs'         },
  '/cli':             { title: 'CLI Management', badge: 'CLI'         },
}

const SIDEBAR_KEY = 'blanketops.sidebar'

function loadCollapsed(): boolean {
  try { return window.localStorage.getItem(SIDEBAR_KEY) === 'collapsed' } catch { return false }
}

// ── Toast system ────────────────────────────────────────────────────────
interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

let toastId = 0

const ToastContext = createContext<{ showToast: (message: string, type?: 'success' | 'error' | 'info') => void } | null>(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within Layout')
  return ctx
}

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const location   = useLocation()
  const { health } = useConnectivity()
  const connected  = health?.connected ?? false
  const [collapsed, setCollapsed] = useState(loadCollapsed)
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }

  useEffect(() => {
    try { window.localStorage.setItem(SIDEBAR_KEY, collapsed ? 'collapsed' : 'expanded') } catch { /* page-only */ }
  }, [collapsed])

  const base = '/' + location.pathname.split('/')[1]
  const meta = ROUTE_META[base] ?? { title: 'Dashboard' }

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="app">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className="main">

          <header className="topbar">
            <div className="topbar-left">
              <button
                type="button"
                className="topbar-btn topbar-btn--square"
                onClick={() => setCollapsed(c => !c)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-pressed={collapsed}
              >
                <i className={`ti ${collapsed ? 'ti-layout-sidebar-left-expand' : 'ti-layout-sidebar-left-collapse'}`} />
              </button>
              <span className="topbar-title">{meta.title}</span>
              {meta.badge && <span className="kind-badge">{meta.badge}</span>}
            </div>
            <div className="topbar-right">
              <span className={`watch${connected ? ' watch--live' : ''}`}>
                <span className={`watching-dot${connected ? ' watching-dot--live' : ''}`} />
                <span className="watching-label">{connected ? 'watching' : 'reconnecting…'}</span>
              </span>
              <SkinMenu />
              <ModeToggle />
            </div>
          </header>

          {/* Indeterminate bar — sweeps when polling / reconnecting */}
          <div className="tbar">
            <div className={`tbar-fill${connected ? ' tbar-fill--active' : ' tbar-fill--warn'}`} />
          </div>

          <ConnectivityStatus />
          <div className="content">{children}</div>

          {/* Toasts */}
          <div className="toast-container">
            {toasts.map(t => (
              <div key={t.id} className={`toast toast--${t.type}`}>
                <span>{t.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToastContext.Provider>
  )
}
