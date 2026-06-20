import type { FC, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ConnectivityPill } from './ConnectivityPill'

interface RouteMeta { title: string; badge?: string }

const ROUTE_META: Record<string, RouteMeta> = {
  '/':           { title: 'home' },
  '/dashboard':  { title: 'dashboard' },
  '/environments':    { title: 'environment',    badge: 'Environment' },
  '/builds':          { title: 'build',          badge: 'Build' },
  '/buildtriggers':   { title: 'build trigger',  badge: 'BuildTrigger' },
  '/packages':        { title: 'package',        badge: 'Package' },
  '/serviceunits':    { title: 'service unit',   badge: 'ServiceUnit' },
  '/deployments':     { title: 'deployment',     badge: 'Deployment' },
  '/gitrepositories': { title: 'git repository', badge: 'GitRepository' },
  '/githubevents':    { title: 'github event',   badge: 'GitHubEvent' },
  '/githubpayloads':  { title: 'github payload', badge: 'GitHubPayload' },
  '/routes':          { title: 'route',          badge: 'Route' },
  '/domains':         { title: 'domain',         badge: 'Domain' },
  '/supplychains':    { title: 'supply chain',   badge: 'SupplyChain' },
  '/githubwebhooks':  { title: 'github webhook', badge: 'GitHubWebhook' },
}

interface Props { children: ReactNode }

export const Layout: FC<Props> = ({ children }) => {
  const location = useLocation()
  const base = '/' + location.pathname.split('/')[1]
  const meta = ROUTE_META[base] ?? { title: 'dashboard' }
  const isDashboard = base === '/dashboard'

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">{meta.title}</span>
            {meta.badge && <span className="kind-badge">{meta.badge}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ConnectivityPill />
            {isDashboard && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="live-dot" />
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>live</span>
              </div>
            )}
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  )
}