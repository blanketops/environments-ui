import { useEffect, useState, type FC, type ReactNode, createContext, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ConnectivityStatus } from './ConnectivityStatus'
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
  '/supplychains':    { title: 'Supply Chains',  badge: 'SupplyChain'   },
  '/githubwebhooks':  { title: 'GitHub Webhooks',badge: 'GitHubWebhook' },
  '/logs':            { title: 'Logs',          badge: 'Logs'         },
}

const SIDEBAR_KEY = 'blanketops.sidebar'

function loadCollapsed(): boolean {
  try { return window.localStorage.getItem(SIDEBAR_KEY) === 'collapsed' } catch { return false }
}

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
          <nav className="navbar navbar-expand navbar-dark bg-dark fixed-top">
            <div className="container-fluid">
              <div className="d-flex align-items-center">
                <button type="button" className="btn btn-link btn-sm text-white order-1 order-sm-0" onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={collapsed}>
                  <i className="fa fa-bars" />
                </button>
                <h1 className="page-title ml-2">{meta.title}</h1>
                {meta.badge && <span className="badge badge-info ml-2">{meta.badge}</span>}
              </div>
              <div className="ml-auto">
                <span className={`text-${connected ? 'success' : 'danger'}`}>
                  <span className={`fa fa-circle ${connected ? 'text-success' : 'text-danger'} mr-1`} />
                  {connected ? 'watching' : 'reconnecting…'}
                </span>
              </div>
            </div>
          </nav>
          <div className="tbar">
            <div className={`tbar-fill${connected ? ' tbar-fill--active' : ' tbar-fill--warn'}`} />
          </div>
          <ConnectivityStatus />
          <div className="content">{children}</div>
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
