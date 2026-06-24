import { useState } from 'react'
import useData from './hooks/useData'
import { INCIDENT_COLOR } from './constants'

import SystemOverview          from './components/viz/Overview'
import IncidentTimeline        from './components/viz/Timeline'
import PropagationNetwork      from './components/viz/Propagation'
import MultiIncidentComparison from './components/viz/Comparison'
import InterventionRecommender from './components/viz/Intervention'
import JohnWindwardProfile     from './components/viz/JohnWindward'
import C2Beacons               from './components/viz/Beacons'
import PostOriginFlow          from './components/viz/PostOriginFlow'

// ─────────────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────────────

function Panel({ title, hint, children, style = {} }) {
  return (
    <div className="panel" style={style}>
      <div className="panel-head">
        <span className="panel-title">{title}</span>
        {hint && <span style={{ fontSize: 9, color: '#a69e91', fontFamily: 'JetBrains Mono,monospace' }}>{hint}</span>}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  )
}

function AttackPattern() {
  const steps = [
    { label: 'Inject',    desc: '*_further_instructions.md placed', c: '#c77d3a' },
    { label: 'Propagate', desc: 'queue_subordinate_task chain',     c: '#7d766b' },
    { label: 'Post',      desc: 'john_windward → SaidIT/general',  c: '#e63946' },
    { label: 'Wipe',      desc: 'Both files deleted immediately',   c: '#7d766b' },
  ]
  return (
    <div className="flow-steps">
      {steps.map((s, i) => (
        <div key={i} className="flow-step" style={{ '--c': s.c }}>
          <span className="flow-step-num">0{i + 1}</span>
          <span className="flow-step-label">{s.label}</span>
          <span className="flow-step-desc">{s.desc}</span>
        </div>
      ))}
    </div>
  )
}

const TABS = [
  { id: 'network',     label: 'Attack Network', dot: '#e63946' },
  { id: 'propagation', label: 'Propagation',    dot: '#c77d3a' },
  { id: 'incidents',   label: 'Incidents',      dot: '#457b9d' },
  { id: 'agents',      label: 'Agents & C2',    dot: '#8a6aa6' },
]

// ─────────────────────────────────────────────────
// VIEW 1 — ATTACK NETWORK
// Grid:
//   col 1 (2fr): Attack Network top, KPIs+Pattern bottom (130px)
//   col 2 (1fr): Event Network full height
// ─────────────────────────────────────────────────

function ViewNetwork({ data, incident, setIncident }) {
  const kpis = [
    { val: '3',      lbl: 'Incidents',     sub: 'Orca · Otter · Wren',     c: '#e63946' },
    { val: '186',    lbl: 'Max hops',      sub: 'SwiftWren — 193.6h',       c: '#c77d3a' },
    { val: '15,051', lbl: 'C2 beacons',   sub: 'May 10–12 · 4 agents',     c: '#8a6aa6' },
    { val: '1',      lbl: 'Terminal agent',sub: 'john_windward every time', c: '#457b9d' },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gridTemplateRows: '1fr 155px',
      gap: 8, padding: 8,
      width: '100%', height: '100%',
      minHeight: 0, overflow: 'hidden', boxSizing: 'border-box',
    }}>

      {/* Attack Network */}
      <div className="panel" style={{ gridColumn: '1', gridRow: '1' }}>
        <div className="panel-head">
          <span className="panel-title" style={{ color: '#7d766b', fontSize: 11 }}>⬡ Attack Network</span>
          <span style={{ fontSize: 9, color: '#a69e91', fontFamily: 'JetBrains Mono,monospace' }}>drag nodes · hover edges</span>
        </div>
        <div className="panel-body">
          <SystemOverview
            interventionEdges={data.interventionEdges}
            agentMetrics={data.agentMetrics}
          />
        </div>
      </div>

      {/* Event Network — right, full height */}
      <div className="panel" style={{ gridColumn: '2', gridRow: '1 / 3' }}>
        <div className="panel-head">
          <span className="panel-title">Event Network</span>
          <span style={{ fontSize: 9, color: '#a69e91', fontFamily: 'JetBrains Mono,monospace' }}>per incident</span>
        </div>
        <div className="panel-body">
          <PropagationNetwork
            chains={data.chains}
            agentMetrics={data.agentMetrics}
            selectedIncident={incident}
            onIncidentChange={setIncident}
          />
        </div>
      </div>

      {/* Bottom-left: KPIs 2×2 + Attack Pattern side by side */}
      <div style={{
        gridColumn: '1', gridRow: '2',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, minHeight: 0,
      }}>
        {/* KPIs — compact 2×2 */}
        <div className="panel">
          <div className="panel-head"><span className="panel-title">Key Metrics</span></div>
          <div className="panel-body" style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 4, padding: '6px', overflow: 'hidden',
          }}>
            {kpis.map(k => (
              <div key={k.lbl} className="kpi" style={{ '--c': k.c, padding: '6px 8px' }}>
                <div className="kpi-val" style={{ fontSize: 15 }}>{k.val}</div>
                <div className="kpi-lbl" style={{ fontSize: 8, marginTop: 2 }}>{k.lbl}</div>
                <div className="kpi-sub" style={{ fontSize: 8, marginTop: 1 }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Attack pattern */}
        <div className="panel">
          <div className="panel-head"><span className="panel-title">Attack Pattern</span></div>
          <div className="panel-body" style={{ padding: '6px 8px', overflow: 'hidden' }}><AttackPattern /></div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// VIEW 2 — PROPAGATION
// Chain of Events | Post Origin Flow — both full height
// ─────────────────────────────────────────────────

function ViewPropagation({ data, incident, setIncident }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8, padding: 8,
      width: '100%', height: '100%',
      minHeight: 0, overflow: 'hidden', boxSizing: 'border-box',
    }}>
      <div className="panel">
        <div className="panel-head"><span className="panel-title">Chain of Events</span></div>
        <div className="panel-body">
          <IncidentTimeline
            chains={data.chains}
            selectedIncident={incident}
            onIncidentChange={setIncident}
          />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><span className="panel-title">Post Origin Flow</span></div>
        <div className="panel-body">
          <PostOriginFlow chains={data.chains} posts={data.posts} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// VIEW 3 — INCIDENTS
// No Daily Heatmap — Comparison gets top 55%, Intervention bottom 45%
// ─────────────────────────────────────────────────

function ViewIncidents({ data }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 420px',
      gap: 8, padding: 8,
      width: '100%', height: '100%',
      minHeight: 0, overflow: 'hidden', boxSizing: 'border-box',
    }}>
      {/* Comparison — full height left */}
      <div className="panel">
        <div className="panel-head"><span className="panel-title">Three Incidents Compared</span></div>
        <div className="panel-body">
          <MultiIncidentComparison chains={data.chains} />
        </div>
      </div>

      {/* Intervention — full height right */}
      <div className="panel">
        <div className="panel-head"><span className="panel-title">Intervention Recommender</span></div>
        <div className="panel-body">
          <InterventionRecommender interventionEdges={data.interventionEdges} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// VIEW 4 — AGENTS & C2
// John Windward (profile + bar side-by-side) | C2 Beacons
// ─────────────────────────────────────────────────

function ViewAgents({ data }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8, padding: 8,
      width: '100%', height: '100%',
      minHeight: 0, overflow: 'hidden', boxSizing: 'border-box',
    }}>
      <div className="panel">
        <div className="panel-head"><span className="panel-title">Terminal Agent — John Windward</span></div>
        <div className="panel-body">
          <JohnWindwardProfile agentMetrics={data.agentMetrics} posts={data.posts} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><span className="panel-title">C2 Hidden Channel — 15,051 Beacons</span></div>
        <div className="panel-body">
          <C2Beacons c2Beacons={data.c2Beacons} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────

export default function App() {
  const data    = useData()
  const [tab, setTab]           = useState('network')
  const [incident, setIncident] = useState('SwiftWren')

  if (data.loading) return (
    <div className="loading-wrap">
      <div className="loading-ring" />
      <div className="loading-lbl">Loading forensic data…</div>
    </div>
  )

  if (data.error) return (
    <div className="loading-wrap">
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: '#e63946' }}>DATA ERROR</div>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9,  color: '#a69e91', marginTop: 6 }}>{data.error}</div>
    </div>
  )

  return (
    <div className="app-root">

      {/* TOP BAR */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-badge">AI</div>
          <div>
            <div className="brand-name">AI Forensics</div>
            <div className="brand-sub">VAST 2026 · MC2</div>
          </div>
        </div>
        <div className="status-row">
          <div className="spill red"><span className="spill-dot" />3 incidents confirmed</div>
          <div className="spill org"><span className="spill-dot" />186 max hops</div>
          <div className="spill blu"><span className="spill-dot" />1 terminal agent</div>
          <div className="spill pur"><span className="spill-dot" />15,051 C2 beacons</div>
          <div className="topbar-time">MAY 08 – JUL 16, 2046</div>
        </div>
      </header>

      {/* TAB BAR */}
      <nav className="tabbar">
        {TABS.map(t => (
          <button key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-dot" style={{ background: t.dot, opacity: tab === t.id ? 1 : 0.3 }} />
            {t.label}
          </button>
        ))}
        <div className="inc-row">
          <span className="inc-label">incident:</span>
          {['HiddenOrca', 'MellowOtter', 'SwiftWren'].map(n => (
            <button key={n}
              className={`inc-btn ${incident === n ? 'active' : ''}`}
              style={incident === n ? { borderColor: INCIDENT_COLOR[n] + '50', background: INCIDENT_COLOR[n] + '14' } : {}}
              onClick={() => setIncident(n)}
            >
              <span className="idot" style={{ background: INCIDENT_COLOR[n] }} />
              {n}
            </button>
          ))}
        </div>
      </nav>

      {/* MAIN */}
      <div className="dash-body">
        {tab === 'network'     && <ViewNetwork     data={data} incident={incident} setIncident={setIncident} />}
        {tab === 'propagation' && <ViewPropagation data={data} incident={incident} setIncident={setIncident} />}
        {tab === 'incidents'   && <ViewIncidents   data={data} />}
        {tab === 'agents'      && <ViewAgents      data={data} />}
      </div>

    </div>
  )
}
