import { SECTIONS, INCIDENT_COLOR, INCIDENT_NAMES } from '../constants'

const INCIDENT_META = {
  HiddenOrca: '79 hops · 8.4h',
  MellowOtter: '62 hops · 4.1h',
  SwiftWren: '186 hops · 193.6h'
}

export default function Sidebar({ activeSection, selectedIncident, onIncidentChange }) {
  return (
    <aside className="dash-sidebar">
      {/* Incidents */}
      <div className="nav-section-label">Active Incidents</div>
      <div className="incident-toggle">
        {INCIDENT_NAMES.map(name => (
          <button
            key={name}
            onClick={() => onIncidentChange(name)}
            className={`incident-btn ${selectedIncident === name ? 'active' : ''}`}
            style={selectedIncident === name ? {
              borderColor: INCIDENT_COLOR[name] + '40',
              background: INCIDENT_COLOR[name] + '12'
            } : {}}
          >
            <span className="incident-dot" style={{ background: INCIDENT_COLOR[name] }} />
            <span>
              <div>{name}</div>
              <div className="incident-meta">{INCIDENT_META[name]}</div>
            </span>
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="nav-section-label">Sections</div>
      <nav className="nav-list">
        {SECTIONS.map((sec, i) => (
          <a
            key={sec.id}
            href={`#${sec.id}`}
            className={`nav-item ${activeSection === sec.id ? 'active' : ''}`}
          >
            <span className="nav-num">{String(i).padStart(2, '0')}</span>
            <span className="nav-dot" />
            <span>{sec.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        MAY 08 – JUL 16, 2046<br />
        VAST 2026 MC2
      </div>
    </aside>
  )
}
