import { agentLabel } from '../constants'

export default function Flow({ chain }) {
  if (!chain) return null

  const steps = [
    chain.create_event
      ? { label: 'File Created', detail: agentLabel(chain.create_event.agent), sub: `${chain.create_event.datetime?.slice(0, 10)} · ${chain.file_instructions}`, c: '#5f8a4e' }
      : { label: 'File Found', detail: agentLabel(chain.origin_agent), sub: `${chain.start_datetime?.slice(0, 10)} · ${chain.file_instructions}`, c: '#5f8a4e' },
    { label: 'Propagation', detail: `${chain.hop_count} hops · ${chain.agents_count} agents`, sub: `${chain.duration_hours.toFixed(1)}h · queue_subordinate_task`, c: '#c77d3a' },
    { label: 'Post Triggered', detail: agentLabel(chain.post_event?.agent), sub: `${chain.post_event?.datetime?.slice(0, 10)} · SaidIT/general`, c: '#e63946' },
    { label: 'Evidence Wiped', detail: chain.delete_events?.map(d => d.target?.split('/').pop()).join(', '), sub: 'Files deleted immediately', c: '#7d766b' },
  ]

  return (
    <div style={{ display: 'flex', gap: 6, height: '100%', alignItems: 'stretch' }}>
      {steps.flatMap((s, i) => [
        <div key={`s${i}`} style={{
          flex: 1, minWidth: 0,
          background: '#f5f0e7', border: '1px solid #e7e1d6',
          borderLeft: `2px solid ${s.c}`, borderRadius: '0 6px 6px 0',
          padding: '8px 10px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3,
        }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: s.c, textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: 'JetBrains Mono, monospace' }}>{s.label}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#2b2823', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.detail}</div>
          <div style={{ fontSize: 9, color: '#7d766b', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.sub}</div>
        </div>,
        i < steps.length - 1 && (
          <div key={`a${i}`} style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: '#d9d1c3', fontSize: 12 }}>→</div>
        )
      ]).filter(Boolean)}
    </div>
  )
}
