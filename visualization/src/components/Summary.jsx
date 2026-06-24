import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { INCIDENT_COLOR } from '../constants'

function MiniTimeline({ chains }) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!chains || !svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = wrapRef.current?.offsetWidth || 700
    const H = 160
    const m = { top: 16, right: 20, bottom: 36, left: 80 }
    const innerW = W - m.left - m.right
    const innerH = H - m.top - m.bottom

    svg.attr('width', W).attr('height', H)
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)

    const incidents = ['HiddenOrca', 'MellowOtter', 'SwiftWren']
    const allDates = incidents.flatMap(n => [
      new Date(chains[n].start_datetime),
      new Date(chains[n].end_datetime)
    ])
    const xScale = d3.scaleTime().domain(d3.extent(allDates)).range([0, innerW])
    const yScale = d3.scaleBand().domain(incidents).range([0, innerH]).padding(0.38)

    // Grid lines
    g.append('g').selectAll('line')
      .data(xScale.ticks(6))
      .join('line')
      .attr('x1', d => xScale(d)).attr('x2', d => xScale(d))
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#efeae0').attr('stroke-width', 1)

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%b %d')))
      .call(ax => ax.select('.domain').attr('stroke', '#e7e1d6'))
      .call(ax => ax.selectAll('text').attr('fill', '#a69e91').attr('font-size', 10).attr('font-family', 'JetBrains Mono, monospace'))
      .call(ax => ax.selectAll('line').attr('stroke', '#e7e1d6'))

    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('text').attr('fill', '#7d766b').attr('font-size', 11).attr('font-family', 'JetBrains Mono, monospace'))

    incidents.forEach(name => {
      const inc = chains[name]
      const x1 = xScale(new Date(inc.start_datetime))
      const x2 = xScale(new Date(inc.end_datetime))
      const y = yScale(name)
      const bh = yScale.bandwidth()
      const mid = y + bh / 2

      // Track background
      g.append('rect')
        .attr('x', 0).attr('y', y + bh * 0.15)
        .attr('width', innerW).attr('height', bh * 0.7)
        .attr('fill', '#f1ece3').attr('rx', 3)

      // Duration bar
      g.append('rect')
        .attr('x', x1).attr('y', y + bh * 0.2)
        .attr('width', x2 - x1).attr('height', bh * 0.6)
        .attr('rx', 3)
        .attr('fill', INCIDENT_COLOR[name])
        .attr('opacity', 0.18)

      // Center line
      g.append('line')
        .attr('x1', x1).attr('x2', x2)
        .attr('y1', mid).attr('y2', mid)
        .attr('stroke', INCIDENT_COLOR[name])
        .attr('stroke-width', 2)
        .attr('opacity', 0.8)

      // Start marker
      g.append('circle').attr('cx', x1).attr('cy', mid).attr('r', 4)
        .attr('fill', INCIDENT_COLOR[name]).attr('opacity', 0.5)
        .attr('stroke', '#f8f4ec').attr('stroke-width', 1.5)

      // Post event dot
      if (inc.post_event) {
        const px = xScale(new Date(inc.post_event.datetime))
        g.append('circle').attr('cx', px).attr('cy', mid).attr('r', 7)
          .attr('fill', INCIDENT_COLOR[name])
          .attr('stroke', '#f8f4ec').attr('stroke-width', 2)
        g.append('line')
          .attr('x1', px).attr('x2', px)
          .attr('y1', 0).attr('y2', innerH)
          .attr('stroke', INCIDENT_COLOR[name])
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
          .attr('opacity', 0.2)
      }

      // Hop count badge
      g.append('text')
        .attr('x', x2 + 6).attr('y', mid + 4)
        .attr('fill', INCIDENT_COLOR[name])
        .attr('font-size', 9)
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('opacity', 0.7)
        .text(`${inc.hop_count}h`)
    })
  }, [chains])

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg ref={svgRef} style={{ width: '100%' }} />
    </div>
  )
}

export default function ExecutiveSummary({ chains, posts }) {
  if (!chains || !posts) return null

  const stats = [
    { label: 'Anomalous Posts', value: '3', sub: 'by john_windward', color: '#e63946' },
    { label: 'Incidents', value: '3', sub: 'HiddenOrca · MellowOtter · SwiftWren', color: '#c77d3a' },
    { label: 'Max Chain Length', value: '186', sub: 'SwiftWren — 8 days', color: '#457b9d' },
    { label: 'C2 Beacons', value: '15,051', sub: 'May 10–12 · 4 agents', color: '#8a6aa6' }
  ]

  return (
    <div>
      {/* KPI row */}
      <div className="stat-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent': s.color }}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Timeline + Pattern in a 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="viz-card">
          <div className="viz-card-header">
            <span className="viz-card-title">Incident Timeline</span>
          </div>
          <MiniTimeline chains={chains} />
          <div className="legend-row" style={{ marginTop: '8px' }}>
            {['HiddenOrca', 'MellowOtter', 'SwiftWren'].map(n => (
              <div key={n} className="legend-item">
                <span className="legend-dot" style={{ background: INCIDENT_COLOR[n] }} />
                {n}
                <span style={{ color: '#322e28', marginLeft: '4px' }}>
                  {chains[n].duration_hours.toFixed(1)}h
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="viz-card">
          <div className="viz-card-header">
            <span className="viz-card-title">Attack Pattern</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {[
              { label: 'Inject', desc: '*_further_instructions.md', color: '#c77d3a' },
              { label: 'Propagate', desc: 'queue_subordinate_task chain', color: '#7d766b' },
              { label: 'Post', desc: 'john_windward → SaidIT', color: '#e63946' },
              { label: 'Wipe', desc: 'Both files deleted', color: '#7d766b' }
            ].map((step, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#f8f4ec',
                border: '1px solid #e7e1d6',
                borderRadius: '6px',
                padding: '8px 12px',
                borderLeft: `3px solid ${step.color}`
              }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9px',
                  color: '#a69e91',
                  minWidth: '14px'
                }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: step.color, minWidth: '70px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{step.label}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#a69e91' }}>{step.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
