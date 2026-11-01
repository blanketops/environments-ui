import type { FC } from 'react'
import { NavLink } from 'react-router-dom'

interface NavItem { label: string; to: string; icon: string }
interface Section { title: string; items: NavItem[] }

const NAV: Section[] = [
  {
    title: 'PLATFORM', items: [
      { label: 'Home',      to: '/',          icon: 'ti-home' },
      { label: 'Dashboard', to: '/dashboard', icon: 'ti-layout-dashboard' },
    ],
  },
  {
    title: 'ENVIRONMENTS', items: [
      { label: 'Environment',  to: '/environments',  icon: 'ti-box' },
      { label: 'Build',        to: '/builds',        icon: 'ti-package' },
      { label: 'Package',      to: '/packages',      icon: 'ti-box-multiple' },
      { label: 'Service Unit', to: '/serviceunits',  icon: 'ti-server' },
      { label: 'Deployment',   to: '/deployments',   icon: 'ti-rocket' },
    ],
  },
  {
    title: 'NETWORKING', items: [
      { label: 'Route',  to: '/routes',  icon: 'ti-route' },
      { label: 'Domain', to: '/domains', icon: 'ti-world' },
    ],
  },
  {
    title: 'SOURCES', items: [
      { label: 'Git Repository', to: '/gitrepositories', icon: 'ti-git-branch' },
    ],
  },
  {
    title: 'EVENTS', items: [
      { label: 'GitHub Event', to: '/githubevents', icon: 'ti-webhook' },
    ],
  },
  {
    title: 'SUPPLY CHAIN', items: [
      { label: 'Supply Chain',   to: '/supplychains',   icon: 'ti-shield-check' },
      { label: 'GitHub Webhook', to: '/githubwebhooks', icon: 'ti-plug-connected' },
    ],
  },
  {
    title: 'DEPENDENCIES', items: [
      { label: 'Dependencies', to: '/dependencies', icon: 'ti-database' },
    ],
  },
]

export const Sidebar: FC<{ collapsed?: boolean }> = ({ collapsed = false }) => (
  <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
    <NavLink to="/" className="logo" aria-label="BlanketOps Environments home">
      <img className="logo-mark" src="/logo.png" alt="" aria-hidden="true" />
      <span className="logo-text">
        <span className="logo-name">blanket<em>ops</em></span>
        <span className="logo-scope">environments</span>
      </span>
    </NavLink>
    <nav className="sidebar-nav">
      {NAV.map(section => (
        <div key={section.title} className="nav-group">
          <p className="nav-section">
            <span className="nav-section-text">{section.title}</span>
            <i className="ti ti-dots nav-section-dots" aria-hidden="true" />
          </p>
          {section.items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <i className={`ti ${item.icon}`} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  </aside>
)
