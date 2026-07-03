import Overview from '../components/Overview'
import JohnWindward from '../components/JohnWindward'

export default function EmployeeNetwork({ data, filter, onFilterChange, jwSelected, onJwToggle, onJwDismiss, onBlockEdgeClick }) {
  return (
    <div className="panel" style={{ gridColumn: '1', gridRow: '1' }}>
      <div className="panel-head">
        <span className="panel-title" style={{ color: '#7d766b', fontSize: 11 }}>Employee Network</span>
        {jwSelected &&
          <button className="chip" onClick={onJwDismiss}>x Dismiss</button>
        }
      </div>
      <div className="panel-body" style={{ flexDirection: 'row', padding: 0, gap: 0, overflow: 'hidden' }}>
        <div style={{ flex: jwSelected ? '0 0 58%' : 1, minWidth: 0, padding: '10px 12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Overview
            interventionEdges={data.interventionEdges}
            agentMetrics={data.agentMetrics}
            filter={filter}
            onFilterChange={onFilterChange}
            onJWClick={onJwToggle}
            onBlockEdgeClick={onBlockEdgeClick}
          />
        </div>
        {jwSelected && (
          <>
            <div style={{ width: 1, background: '#efeae0', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, padding: '10px 12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <JohnWindward agentMetrics={data.agentMetrics} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
