import { useEffect, useState, type FC, type ReactNode } from 'react'
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
  '/supplychains':    { title: 'Supply Chains',  badge: 'SupplyChain'   },
  '/githubwebhooks':  { title: 'GitHub Webhooks',badge: 'GitHubWebhook' },
}

const SIDEBAR_KEY = 'blanketops.sidebar'

function loadCollapsed(): boolean {
  try { return window.localStorage.getItem(SIDEBAR_KEY) === 'collapsed' } catch { return false }
}

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const location   = useLocation()
  const { health } = useConnectivity()
  const connected  = health?.connected ?? false
  const [collapsed, setCollapsed] = useState(loadCollapsed)

  useEffect(() => {
    try { window.localStorage.setItem(SIDEBAR_KEY, collapsed ? 'collapsed' : 'expanded') } catch { /* page-only */ }
  }, [collapsed])

  const base = '/' + location.pathname.split('/')[1]
  const meta = ROUTE_META[base] ?? { title: 'Dashboard' }

  return (
    <div className="app">
      <Sidebar collapsed={collapsed} />
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
      </div>
    </div>
  )
}
