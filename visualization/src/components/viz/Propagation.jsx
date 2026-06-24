import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import Tooltip from '../shared/Tooltip'
import { INCIDENT_COLOR, DEPT_COLOR, DEPT_IDS, DEPT_LABELS, C2_AGENTS, JOHN_WINDWARD, agentLabel, deptLabel } from '../../constants'

export default function PropagationNetwork({ chains, agentMetrics, selectedIncident, onIncidentChange }) {
  const svgRef   = useRef(null)
  const wrapRef  = useRef(null)
  const simRef   = useRef(null)
  const [tooltip, setTooltip]     = useState(null)
  const [showLabels, setShowLabels] = useState(true)

  const metricsMap = {}
  agentMetrics?.agents?.forEach(a => { metricsMap[a.agent_id] = a })

  // Core draw function — called after we know the container has real dimensions
  const draw = useCallback(() => {
    if (!chains || !agentMetrics || !svgRef.current || !wrapRef.current) return
    const incident = chains[selectedIncident]
    if (!incident) return

    const W = wrapRef.current.offsetWidth
    const H = wrapRef.current.offsetHeight
    if (!W || !H) return   // container not yet laid out — bail, ResizeObserver will retry

    if (simRef.current) simRef.current.stop()
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', W).attr('height', H)

    // Build graph
    const nodeSet = new Set()
    const edgeMap = {}
    incident.hops.forEach(h => {
      nodeSet.add(h.from)
      nodeSet.add(h.to)
      const key = `${h.from}|||${h.to}`
      edgeMap[key] = (edgeMap[key] || 0) + 1
    })

    const nodes = [...nodeSet].map(id => ({
      id,
      label: agentLabel(id),
      dept: metricsMap[id]?.department || 'unknown',
      is_c2: C2_AGENTS.includes(id),
      participation: incident.hops.filter(h => h.from === id || h.to === id).length
    }))

    const links = Object.entries(edgeMap).map(([key, count]) => {
      const [source, target] = key.split('|||')
      return { source, target, count }
    })

    const originId   = incident.origin_agent
    const terminalId = JOHN_WINDWARD

    // Clamp nodes inside bounds
    const PAD = 30
    const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val))

    const simulation = d3.forceSimulation(nodes)
      .force('link',      d3.forceLink(links).id(d => d.id).distance(70).strength(0.5))
      .force('charge',    d3.forceManyBody().strength(-280))
      .force('center',    d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(d => 10 + Math.sqrt(d.participation) * 1.8))
      .force('x',         d3.forceX(W / 2).strength(0.04))
      .force('y',         d3.forceY(H / 2).strength(0.04))
    simRef.current = simulation

    const defs = svg.append('defs')
    defs.append('marker').attr('id', `arrow-${selectedIncident}`)
      .attr('viewBox', '0 -5 10 10').attr('refX', 18).attr('refY', 0)
      .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#a69e91')

    const linkEl = svg.append('g').selectAll('line')
      .data(links).join('line')
      .attr('stroke', '#e8e1d4')
      .attr('stroke-width', d => Math.max(1, Math.sqrt(d.count) * 1.4))
      .attr('opacity', 0.6)
      .attr('marker-end', `url(#arrow-${selectedIncident})`)

    const nodeEl = svg.append('g').selectAll('g')
      .data(nodes).join('g')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end',  (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null; d.fy = null
        })
      )

    nodeEl.append('circle')
      .attr('r', d => 7 + Math.sqrt(d.participation) * 1.6)
      .attr('fill', d => DEPT_COLOR(d.dept))
      .attr('stroke', d => {
        if (d.id === terminalId) return '#e63946'
        if (d.id === originId)   return '#5f8a4e'
        if (d.is_c2)             return '#8a6aa6'
        return '#fdfbf7'
      })
      .attr('stroke-width', d => (d.id === terminalId || d.id === originId || d.is_c2) ? 2.5 : 1.5)

    nodeEl.filter(d => d.is_c2)
      .append('circle')
      .attr('r', d => 11 + Math.sqrt(d.participation) * 1.8)
      .attr('fill', 'none')
      .attr('stroke', '#8a6aa6')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.5)

    nodeEl.append('text')
      .attr('class', 'node-label')
      .attr('dy', d => -(9 + Math.sqrt(d.participation) * 1.6))
      .attr('text-anchor', 'middle')
      .attr('font-size', 9)
      .attr('fill', '#7d766b')
      .text(d => d.label.split(' ')[0])
      .attr('visibility', showLabels ? 'visible' : 'hidden')

    nodeEl
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: (
            <div>
              <div className="font-semibold text-slate-800">{d.label}</div>
              <div className="text-slate-600 text-xs">{deptLabel(d.dept)}</div>
              {d.is_c2 && <div className="text-violet-600 text-xs font-semibold mt-1">C2 Agent</div>}
              <div className="text-slate-600 text-xs mt-1">Participation: {d.participation} events</div>
            </div>
          )
        })
      })
      .on('mouseleave', () => setTooltip(null))

    simulation.on('tick', () => {
      // Keep nodes inside bounds
      nodes.forEach(d => {
        d.x = clamp(d.x, PAD, W - PAD)
        d.y = clamp(d.y, PAD, H - PAD)
      })
      linkEl
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      nodeEl.attr('transform', d => `translate(${d.x},${d.y})`)
    })
  }, [chains, agentMetrics, selectedIncident, showLabels])

  // Redraw when data/incident changes
  useEffect(() => {
    // Small timeout so the panel has finished laying out before we read dimensions
    const t = setTimeout(draw, 50)
    return () => {
      clearTimeout(t)
      if (simRef.current) simRef.current.stop()
    }
  }, [draw])

  // Also redraw when container resizes
  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [draw])

  // Toggle labels without full redraw
  useEffect(() => {
    if (!svgRef.current) return
    d3.select(svgRef.current).selectAll('.node-label')
      .attr('visibility', showLabels ? 'visible' : 'hidden')
  }, [showLabels])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6, minHeight: 0 }}>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['HiddenOrca', 'MellowOtter', 'SwiftWren'].map(n => (
            <button key={n} onClick={() => onIncidentChange(n)} className="chip"
              style={selectedIncident === n ? {
                background: INCIDENT_COLOR[n] + '20',
                borderColor: INCIDENT_COLOR[n] + '60',
                color: '#2b2823'
              } : {}}>
              {n}
            </button>
          ))}
        </div>
        <button onClick={() => setShowLabels(l => !l)} className="chip">
          {showLabels ? 'hide labels' : 'show labels'}
        </button>
      </div>

      {/* SVG — fills remaining height */}
      <div ref={wrapRef} style={{
        flex: 1, minHeight: 0,
        borderRadius: 6, overflow: 'hidden',
        border: '1px solid #e7e1d6',
        background: '#f8f4ec',
      }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
        {[
          { ring: true, color: '#5f8a4e', label: 'Origin' },
          { ring: true, color: '#e63946', label: 'Terminal' },
          { ring: true, color: '#8a6aa6', label: 'C2 agent' },
          ...DEPT_IDS.map(id => ({ dot: true, color: DEPT_COLOR(id), label: DEPT_LABELS[id] }))
        ].map((l, i) => (
          <div key={i} className="legend-item">
            {l.dot  && <span className="legend-dot"  style={{ background: l.color }} />}
            {l.ring && <span className="legend-ring" style={{ color: l.color }} />}
            {l.label}
          </div>
        ))}
      </div>

      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y}>{tooltip.children}</Tooltip>}
    </div>
  )
}
