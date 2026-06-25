import useData from './hooks/useData'
import ViewNetwork from './views/Network'

export default function App() {
  const data = useData()

  if (data.loading) return (
    <div className="loading-wrap">
      <div className="loading-ring" />
      <div className="loading-lbl">Loading forensic data…</div>
    </div>
  )

  if (data.error) return (
    <div className="loading-wrap">
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: '#e63946' }}>DATA ERROR</div>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: '#a69e91', marginTop: 6 }}>{data.error}</div>
    </div>
  )

  return (
    <div className="app-root">

      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-badge"><img src="/fig1.png" alt="AI" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
          <div>
            <div className="brand-name">AI Forensics</div>
            <div className="brand-sub">VAST 2026 · MC2</div>
          </div>
        </div>
        <div className="status-row">
          <div className="spill red"><span className="spill-dot" />3 incidents</div>
          <div className="spill org"><span className="spill-dot" />186 max hops</div>
          <div className="spill blu"><span className="spill-dot" />1 terminal agent</div>
          <div className="spill pur"><span className="spill-dot" />15,051 beacons</div>
          <div className="topbar-time">MAY 08 – JUL 16, 2046</div>
        </div>
      </header>

      <div className="dash-body">
        <ViewNetwork data={data} />
      </div>

    </div>
  )
}
