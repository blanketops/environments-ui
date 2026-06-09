import type { FC } from 'react'
import { NavLink } from 'react-router-dom'

interface NavItem { label: string; to: string; icon: string }
interface Section { title: string; items: NavItem[] }

const NAV: Section[] = [
  {
    title: 'PLATFORM', items: [
      { label: 'dashboard', to: '/', icon: 'ti-layout-dashboard' },
    ],
  },
  {
    title: 'ENVIRONMENTS', items: [
      { label: 'environment',  to: '/environments',  icon: 'ti-box' },
      { label: 'build',        to: '/builds',        icon: 'ti-package' },
      { label: 'build trigger',to: '/buildtriggers', icon: 'ti-player-play' },
      { label: 'package',      to: '/packages',      icon: 'ti-box-multiple' },
      { label: 'service unit', to: '/serviceunits',  icon: 'ti-server' },
      { label: 'deployment',   to: '/deployments',   icon: 'ti-rocket' },
    ],
  },
  {
    title: 'NETWORKING', items: [
      { label: 'route',  to: '/routes',  icon: 'ti-route' },
      { label: 'domain', to: '/domains', icon: 'ti-world' },
    ],
  },
  {
    title: 'SOURCES', items: [
      { label: 'git repository', to: '/gitrepositories', icon: 'ti-git-branch' },
    ],
  },
  {
    title: 'EVENTS', items: [
      { label: 'github event',   to: '/githubevents',   icon: 'ti-webhook' },
      { label: 'github payload', to: '/githubpayloads', icon: 'ti-file-code' },
    ],
  },
  {
    title: 'SUPPLY CHAIN', items: [
      { label: 'supply chain',   to: '/supplychains',   icon: 'ti-shield-check' },
      { label: 'github webhook', to: '/githubwebhooks', icon: 'ti-plug-connected' },
    ],
  },
]

export const Sidebar: FC = () => (
  <aside className="sidebar">
    <div className="logo">blanket<span>ops</span></div>
    <nav style={{ flex: 1, overflowY: 'auto' }}>
      {NAV.map(section => (
        <div key={section.title}>
          <p className="nav-section">{section.title}</p>
          {section.items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
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
