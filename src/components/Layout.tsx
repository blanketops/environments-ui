import type { FC, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ConnectivityStatus } from './ConnectivityStatus'
import { useConnectivity } from '../hooks/useConnectivity'

const ROUTE_META: Record<string, { title: string; badge?: string }> = {
  '/':                { title: 'home' },
  '/dashboard':       { title: 'dashboard' },
  '/environments':    { title: 'environments',   badge: 'Environment'   },
  '/builds':          { title: 'builds',         badge: 'Build'         },
  '/packages':        { title: 'packages',       badge: 'Package'       },
  '/serviceunits':    { title: 'service units',  badge: 'ServiceUnit'   },
  '/deployments':     { title: 'deployments',    badge: 'Deployment'    },
  '/gitrepositories': { title: 'git repositories', badge: 'GitRepository' },
  '/githubevents':    { title: 'github events',  badge: 'GitHubEvent'   },
  '/routes':          { title: 'routes',         badge: 'Route'         },
  '/domains':         { title: 'domains',        badge: 'Domain'        },
  '/supplychains':    { title: 'supply chains',  badge: 'SupplyChain'   },
  '/githubwebhooks':  { title: 'github webhooks',badge: 'GitHubWebhook' },
}

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const location   = useLocation()
  const { health } = useConnectivity()
  const connected  = health?.connected ?? false

  const base = '/' + location.pathname.split('/')[1]
  const meta = ROUTE_META[base] ?? { title: 'dashboard' }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">

        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">{meta.title}</span>
            {meta.badge && <span className="kind-badge">{meta.badge}</span>}
          </div>
          <div className="topbar-right">
            <span className={`watching-dot${connected ? ' watching-dot--live' : ''}`} />
            <span className="watching-label">{connected ? 'watching' : 'reconnecting…'}</span>
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