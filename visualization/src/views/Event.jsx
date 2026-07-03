import Propagation from '../components/Propagation'
import Timeline from '../components/Timeline'
import Intervention from '../components/Intervention'
import Beacons from '../components/Beacons'

const INCIDENTS = ['HiddenOrca', 'MellowOtter', 'SwiftWren']

export default function EventNetwork({ data, incident, onIncidentChange, filter, onFilterChange, onJwToggle, rightMode, onRightModeChange, onBlockEdgeClick }) {
  const isIncidentFilter = INCIDENTS.includes(filter)

  // When an incident is the active filter, the Event Network follows it so all
  // three views (Event Network, Chain of Events, Employee Network) stay in sync.
  const effectiveIncident = isIncidentFilter ? filter : incident

  // Picking an incident here drives the shared filter too (syncs every graph).
  const pickIncident = (n) => {
    onIncidentChange(n)
    onFilterChange(n)
  }

  return (
    <div style={{ gridColumn: '2', gridRow: '1 / 3', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden' }}>
      {rightMode === 'network' ? (
        <>
          <div className="panel" style={{ flex: isIncidentFilter ? '0 0 calc(48% - 4px)' : 1, minHeight: 0 }}>
            <div className="panel-head">
              <span className="panel-title">Event Network</span>
              <button className="chip" onClick={() => onRightModeChange('agents')}>Agents</button>
            </div>
            <div className="panel-body">
              <Propagation
                chains={data.chains}
                agentMetrics={data.agentMetrics}
                selectedIncident={effectiveIncident}
                onIncidentChange={pickIncident}
                onJWClick={onJwToggle}
                onBlockEdgeClick={onBlockEdgeClick}
              />
            </div>
          </div>

          {isIncidentFilter && (
            <div className="panel" style={{ flex: 1, minHeight: 0 }}>
              <div className="panel-head">
                <span className="panel-title">Chain of Events</span>
              </div>
              <div className="panel-body">
                <Timeline
                  chains={data.chains}
                  selectedIncident={filter}
                  onIncidentChange={onFilterChange}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="panel" style={{ flex: 1, minHeight: 0 }}>
            <div className="panel-head">
              <span className="panel-title">Interventions</span>
              <button className="chip" onClick={() => onRightModeChange('network')}>← Network</button>
            </div>
            <div className="panel-body">
              <Intervention Interventions={data.interventionEdges} />
            </div>
          </div>
          <div className="panel" style={{ flex: 1, minHeight: 0 }}>
            <div className="panel-head">
              <span className="panel-title">Hidden Channel</span>
            </div>
            <div className="panel-body">
              <Beacons Beacons={data.c2Beacons} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
