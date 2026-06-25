export default function Pattern() {
  const steps = [
    { label: 'Inject', desc: '*_further_instructions.md placed', c: '#c77d3a' },
    { label: 'Propagate', desc: 'queue_subordinate_task chain', c: '#7d766b' },
    { label: 'Post', desc: 'john_windward → SaidIT/general', c: '#e63946' },
    { label: 'Wipe', desc: 'Both files deleted immediately', c: '#7d766b' },
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
