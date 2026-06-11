import { SECTIONS, INCIDENT_COLOR, INCIDENT_NAMES } from '../constants'

export default function Sidebar({ activeSection, selectedIncident, onIncidentChange }) {
  return (
    <aside className="w-56 shrink-0 sticky top-0 h-screen overflow-y-auto bg-slate-800/60 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">VAST 2026 MC2</div>
        <div className="text-sm font-bold text-slate-100 leading-tight">AI Forensics</div>
      </div>

      <div className="p-4 border-b border-slate-700">
        <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Incidents</div>
        <div className="flex flex-col gap-1.5">
          {INCIDENT_NAMES.map(name => (
            <button
              key={name}
              onClick={() => onIncidentChange(name)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-all text-left"
              style={{
                background: selectedIncident === name ? `${INCIDENT_COLOR[name]}20` : 'transparent',
                border: `1px solid ${selectedIncident === name ? INCIDENT_COLOR[name] : 'transparent'}`,
                color: selectedIncident === name ? '#f1f5f9' : '#94a3b8'
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: INCIDENT_COLOR[name] }}
              />
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation TOC */}
      <nav className="flex-1 p-3">
        <div className="text-xs text-slate-500 mb-2 px-1 uppercase tracking-wide font-medium">Sections</div>
        <ul className="space-y-0.5">
          {SECTIONS.map(sec => (
            <li key={sec.id}>
              <a
                href={`#${sec.id}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-slate-700/60"
                style={{
                  color: activeSection === sec.id ? '#f1f5f9' : '#64748b',
                  background: activeSection === sec.id ? 'rgba(51,65,85,0.6)' : undefined,
                  fontWeight: activeSection === sec.id ? 600 : 400
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
                  style={{
                    background: activeSection === sec.id ? '#e63946' : '#334155'
                  }}
                />
                <span className="leading-tight">{sec.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
        May 8 – Jul 16, 2046
      </div>
    </aside>
  )
}
