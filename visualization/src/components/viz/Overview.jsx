import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import Tooltip from '../shared/Tooltip'
import { INCIDENT_COLOR, DEPT_COLOR, DEPT_IDS, DEPT_LABELS, C2_AGENTS, JOHN_WINDWARD, agentLabel, deptLabel } from '../../constants'

const FILTERS = [
  { key: 'all', label: 'All', color: '#64748b' },
  { key: 'normal', label: 'Normal', color: '#0f1f35' },
  { key: 'HiddenOrca', label: 'HiddenOrca', color: '#f4a261' },
  { key: 'MellowOtter', label: 'MellowOtter', color: '#457b9d' },
  { key: 'SwiftWren', label: 'SwiftWren', color: '#e63946' },
]

function baseEdgeColor(edge) {
  if (edge.in_all_incidents) return '#e63946'
  if (edge.incidents_count >= 2) return '#f4a261'
  if (edge.incidents_count === 1) return '#fed7aa'
  return '#0f1f35'
}

function edgeMatchesFilter(edge, filter) {
  if (filter === 'all') return true
  if (filter === 'normal') return edge.total_anomalous === 0
  return edge[`${filter}_count`] > 0
}

export default function SystemOverview({ interventionEdges, agentMetrics }) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const linkElRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [filter, setFilter] = useState('all')

  const metricsMap = {}
  agentMetrics?.agents?.forEach(a => { metricsMap[a.agent_id] = a })

  // Build simulation once
  useEffect(() => {
    if (!interventionEdges || !agentMetrics || !svgRef.current) return

    if (simRef.current) simRef.current.stop()
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = wrapRef.current?.offsetWidth || 800
    const H = wrapRef.current?.offsetHeight || 560
    svg.attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMid meet')

    const nodeIds = new Set()
    interventionEdges.edges.forEach(e => { nodeIds.add(e.from); nodeIds.add(e.to) })
    agentMetrics.agents.forEach(a => nodeIds.add(a.agent_id))

    const nodes = [...nodeIds].map(id => ({
      id,
      label: agentLabel(id),
      dept: metricsMap[id]?.department || 'unknown',
      is_c2: C2_AGENTS.includes(id),
      is_terminal: id === JOHN_WINDWARD,
      total: (metricsMap[id]?.total_sent || 0) + (metricsMap[id]?.total_recv || 0)
    }))

    const links = interventionEdges.edges.map(e => ({ ...e, source: e.from, target: e.to }))

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(60).strength(0.2))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(d => 6 + Math.sqrt(d.total || 1) * 1.5))
    simRef.current = simulation

    const linkEl = svg.append('g').selectAll('line')
      .data(links).join('line')
      .attr('stroke', d => baseEdgeColor(d))
      .attr('stroke-width', d => Math.max(0.5, Math.sqrt(d.total_all || 1) * 0.5))
      .attr('opacity', d => d.total_anomalous > 0 ? 0.7 : 0.25)
      .style('cursor', 'pointer')
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: (
            <div>
              <div className="font-semibold text-slate-200 mb-1 text-xs">
                {agentLabel(d.from)} → {agentLabel(d.to)}
              </div>
              <div className="text-slate-400 text-xs">Normal: {d.normal_count}</div>
              <div className="text-slate-400 text-xs">HiddenOrca: {d.HiddenOrca_count}</div>
              <div className="text-slate-400 text-xs">MellowOtter: {d.MellowOtter_count}</div>
              <div className="text-slate-400 text-xs">SwiftWren: {d.SwiftWren_count}</div>
              <div className="text-slate-300 text-xs mt-1 font-medium">
                Score: {(d.intervention_score || 0).toFixed(3)}
              </div>
            </div>
          )
        })
      })
      .on('mouseleave', () => setTooltip(null))

    linkElRef.current = linkEl

    const nodeEl = svg.append('g').selectAll('g')
      .data(nodes).join('g')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null; d.fy = null
        })
      )

    nodeEl.append('circle')
      .attr('r', d => 4 + Math.sqrt(d.total || 1) * 1.2)
      .attr('fill', d => DEPT_COLOR(d.dept))
      .attr('stroke', d => d.is_terminal ? '#e63946' : d.is_c2 ? '#a78bfa' : '#060b14')
      .attr('stroke-width', d => (d.is_terminal || d.is_c2) ? 2.5 : 1)

    nodeEl
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: (
            <div>
              <div className="font-semibold text-slate-200">{d.label}</div>
              <div className="text-slate-400 text-xs">{deptLabel(d.dept)}</div>
              {d.is_c2 && <div className="text-purple-400 text-xs">C2 Agent</div>}
              {d.is_terminal && <div className="text-red-400 text-xs">Terminal Agent</div>}
              <div className="text-slate-500 text-xs mt-1">Total activity: {d.total}</div>
            </div>
          )
        })
      })
      .on('mouseleave', () => setTooltip(null))

    simulation.on('tick', () => {
      linkEl
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      nodeEl.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => simulation.stop()
  }, [interventionEdges, agentMetrics])

  // Update edge visuals whenever filter changes — no simulation restart
  useEffect(() => {
    const linkEl = linkElRef.current
    if (!linkEl) return

    linkEl
      .attr('stroke', d => edgeMatchesFilter(d, filter) ? baseEdgeColor(d) : '#0a1628')
      .attr('opacity', d => {
        if (!edgeMatchesFilter(d, filter)) return 0.08
        return filter === 'all'
          ? (d.total_anomalous > 0 ? 0.7 : 0.25)
          : 0.85
      })
      .attr('stroke-width', d => {
        if (!edgeMatchesFilter(d, filter)) return 0.5
        return filter === 'all'
          ? Math.max(0.5, Math.sqrt(d.total_all || 1) * 0.5)
          : Math.max(1, Math.sqrt(d.total_all || 1) * 0.8)
      })
  }, [filter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6, minHeight: 0 }}>
      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, color: '#2d4a6a', fontFamily: 'JetBrains Mono, monospace', marginRight: 2 }}>Filter:</span>
        {FILTERS.map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilter(key)} className="chip" style={filter === key ? { background: color + '20', borderColor: color + '60', color: '#f1f5f9' } : {}}>
            {label}
          </button>
        ))}
      </div>

      {/* Network SVG — fills remaining space */}
      <div ref={wrapRef} style={{ flex: 1, minHeight: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid #0d1e34', background: '#060b14' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
        {[
          { dash: true, color: '#334155', label: 'Normal' },
          { dash: true, color: '#fcd34d', label: '1 incident' },
          { dash: true, color: '#f97316', label: '2 incidents' },
          { dash: true, color: '#e63946', label: 'All 3' },
          { ring: true, color: '#e63946', label: 'John W.' },
          { ring: true, color: '#a78bfa', label: 'C2 agent' },
          ...DEPT_IDS.map(id => ({ dot: true, color: DEPT_COLOR(id), label: DEPT_LABELS[id] }))
        ].map((l, i) => (
          <div key={i} className="legend-item">
            {l.dot  && <span className="legend-dot" style={{ background: l.color }} />}
            {l.dash && <span className="legend-dash" style={{ background: l.color }} />}
            {l.ring && <span className="legend-ring" style={{ color: l.color }} />}
            {l.label}
          </div>
        ))}
      </div>

      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y}>{tooltip.children}</Tooltip>}
    </div>
  )
}
