import { INCIDENT_COLOR } from '../constants'
import Flow from '../components/Flow'
import Pattern from '../components/Pattern'

const INCIDENTS = ['HiddenOrca', 'MellowOtter', 'SwiftWren']

const kpis = [
  { val: '3', lbl: 'Incidents', sub: 'Orca · Otter · Wren', c: '#e63946' },
  { val: '186', lbl: 'Max hops', sub: 'SwiftWren — 193.6h', c: '#c77d3a' },
  { val: '15,051', lbl: 'Beacons', sub: 'May 10–12 · 4 agents', c: '#8a6aa6' },
  { val: '1', lbl: 'Terminal agent', sub: 'john_windward every time', c: '#457b9d' },
]

export default function BottomPanel({ data, filter }) {
  const isIncidentFilter = INCIDENTS.includes(filter)

  if (isIncidentFilter) {
    return (
      <div className="panel" style={{ gridColumn: '1', gridRow: '2' }}>
        <div className="panel-head">
          <span className="panel-title">Post Origin</span>
          <span style={{ fontSize: 9, color: INCIDENT_COLOR[filter], fontFamily: 'JetBrains Mono,monospace' }}>{filter}</span>
        </div>
        <div className="panel-body" style={{ padding: '8px 12px' }}>
          <Flow chain={data.chains?.[filter]} />
        </div>
      </div>
    )
  }

  return (
    <div style={{
      gridColumn: '1', gridRow: '2',
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 8, minHeight: 0,
    }}>
      <div className="panel">
        <div className="panel-head"><span className="panel-title">Metrics</span></div>
        <div className="panel-body" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 2, padding: '6px', overflow: 'hidden',
        }}>
          {kpis.map(k => (
            <div key={k.lbl} className="kpi" style={{ '--c': k.c, padding: '6px 8px' }}>
              <div className="kpi-val" style={{ fontSize: 12 }}>{k.val}</div>
              <div className="kpi-lbl" style={{ fontSize: 8, marginTop: 2 }}>{k.lbl}</div>
              <div className="kpi-sub" style={{ fontSize: 8, marginTop: 1 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><span className="panel-title">Pattern</span></div>
        <div className="panel-body" style={{ padding: '6px 8px', overflow: 'hidden' }}>
          <Pattern />
        </div>
      </div>
    </div>
  )
}
