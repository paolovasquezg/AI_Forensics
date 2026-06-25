import { useState } from 'react'
import EmployeeNetwork from './Employee'
import EventNetwork from './Event'
import BottomPanel from './Bottom'

export default function ViewNetwork({ data }) {
  const [incident, setIncident] = useState('SwiftWren')
  const [filter, setFilter] = useState('all')
  const [jwSelected, setJwSelected] = useState(false)
  const [rightMode, setRightMode] = useState('network')

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '3fr 2fr',
      gridTemplateRows: '1fr 155px',
      gap: 8, padding: 8,
      width: '100%', height: '100%',
      minHeight: 0, overflow: 'hidden', boxSizing: 'border-box',
    }}>
      <EmployeeNetwork
        data={data}
        filter={filter}
        onFilterChange={setFilter}
        jwSelected={jwSelected}
        onJwToggle={() => setJwSelected(v => !v)}
        onJwDismiss={() => setJwSelected(false)}
      />
      <EventNetwork
        data={data}
        incident={incident}
        onIncidentChange={setIncident}
        filter={filter}
        onFilterChange={setFilter}
        onJwToggle={() => setJwSelected(v => !v)}
        rightMode={rightMode}
        onRightModeChange={setRightMode}
      />
      <BottomPanel
        data={data}
        filter={filter}
      />
    </div>
  )
}
