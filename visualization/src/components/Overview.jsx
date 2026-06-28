import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import Tooltip from './Tooltip'
import { INCIDENT_COLOR, INCIDENT_NAMES, DEPT_COLOR, DEPT_IDS, DEPT_LABELS, C2_AGENTS, JOHN_WINDWARD, agentLabel, deptLabel } from '../constants'

const FILTERS = [
  { key: 'all', label: 'All', color: '#7d766b' },
  { key: 'normal', label: 'Normal', color: '#e7e1d6' },
  { key: 'HiddenOrca', label: 'HiddenOrca', color: '#c77d3a' },
  { key: 'MellowOtter', label: 'MellowOtter', color: '#457b9d' },
  { key: 'SwiftWren', label: 'SwiftWren', color: '#e63946' },
]

function baseEdgeColor(edge) {
  if (edge.in_all_incidents) return '#e63946'
  if (edge.incidents_count >= 2) return '#c77d3a'
  if (edge.incidents_count === 1) return '#c9943a'
  return '#8c8279'
}

function edgeMatchesFilter(edge, filter) {
  if (filter === 'all') return true
  if (filter === 'normal') return edge.total_anomalous === 0
  return edge[`${filter}_count`] > 0
}

export default function Overview({ interventionEdges, agentMetrics, filter: filterProp, onFilterChange, onJWClick }) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const linkElRef = useRef(null)
  const nodeElRef = useRef(null)
  const maxDegRef = useRef(1)
  const filterRef = useRef('all')
  const selectedRef = useRef(null)
  const restyleRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [filterInternal, setFilterInternal] = useState('all')
  const filter = filterProp !== undefined ? filterProp : filterInternal
  const setFilter = filterProp !== undefined ? onFilterChange : setFilterInternal
  const onJWClickRef = useRef(onJWClick)
  onJWClickRef.current = onJWClick
  filterRef.current = filter

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

    // ── Degree / aristas relacionadas por nodo (global y por incidente) ──
    const nodeById = new Map(nodes.map(n => [n.id, n]))
    nodes.forEach(n => {
      n.degree = 0
      n.incDeg = { normal: 0 }
      INCIDENT_NAMES.forEach(inc => { n.incDeg[inc] = 0 })
    })
    interventionEdges.edges.forEach(e => {
      const ends = [nodeById.get(e.from), nodeById.get(e.to)]
      ends.forEach(n => {
        if (!n) return
        n.degree += 1
        if (e.total_anomalous === 0) n.incDeg.normal += 1
        INCIDENT_NAMES.forEach(inc => { if ((e[`${inc}_count`] || 0) > 0) n.incDeg[inc] += 1 })
      })
    })
    const maxDeg = d3.max(nodes, n => n.degree) || 1
    maxDegRef.current = maxDeg

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(95).strength(0.12))
      .force('charge', d3.forceManyBody().strength(-460).distanceMax(Math.max(W, H) * 0.9))
      .force('x', d3.forceX(W / 2).strength(0.03))
      .force('y', d3.forceY(H / 2).strength(0.055))
      .force('collision', d3.forceCollide(d => 11 + Math.sqrt(d.total || 1) * 1.8).iterations(2))
    simRef.current = simulation

    // Zoom — all content lives inside g so transform applies uniformly
    const g = svg.append('g')
    const zoom = d3.zoom()
      .scaleExtent([0.2, 6])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)
      .on('dblclick.zoom', () =>
        svg.transition().duration(350).call(zoom.transform, d3.zoomIdentity)
      )

    const linkEl = g.append('g').selectAll('line')
      .data(links).join('line')
      .attr('stroke', d => baseEdgeColor(d))
      .attr('stroke-width', d => Math.max(1, Math.sqrt(d.total_all || 1) * 0.7))
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('opacity', d => d.total_anomalous > 0 ? 0.85 : 0.7)
      .style('cursor', 'pointer')
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: (
            <div>
              <div className="font-semibold text-slate-800 mb-1 text-xs">
                {agentLabel(d.from)} → {agentLabel(d.to)}
              </div>
              <div className="text-slate-600 text-xs">Normal: {d.normal_count}</div>
              <div className="text-slate-600 text-xs">HiddenOrca: {d.HiddenOrca_count}</div>
              <div className="text-slate-600 text-xs">MellowOtter: {d.MellowOtter_count}</div>
              <div className="text-slate-600 text-xs">SwiftWren: {d.SwiftWren_count}</div>
              <div className="text-slate-700 text-xs mt-1 font-medium">
                Score: {(d.intervention_score || 0).toFixed(3)}
              </div>
            </div>
          )
        })
      })
      .on('mouseleave', () => setTooltip(null))

    linkElRef.current = linkEl

    const nodeEl = g.append('g').selectAll('g')
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
      .attr('class', 'ov-node-circle')
      .attr('r', d => 4 + Math.sqrt(d.total || 1) * 1.2)
      .attr('fill', d => DEPT_COLOR(d.dept))
      .attr('fill-opacity', d => 0.4 + 0.6 * Math.sqrt((d.degree || 0) / maxDeg))
      .attr('stroke', d => d.is_terminal ? '#e63946' : d.is_c2 ? '#8a6aa6' : '#fdfbf7')
      .attr('stroke-width', d => (d.is_terminal || d.is_c2) ? 2.5 : 1)

    nodeElRef.current = nodeEl

    nodeEl
      .on('click', (event, d) => {
        event.stopPropagation()
        selectedRef.current = (selectedRef.current === d.id) ? null : d.id
        restyleRef.current?.()
        if (d.is_terminal) onJWClickRef.current?.()
      })
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: (
            <div>
              <div className="font-semibold text-slate-800">{d.label}</div>
              <div className="text-slate-600 text-xs">{deptLabel(d.dept)}</div>
              {d.is_c2 && <div className="text-violet-600 text-xs">C2 Agent</div>}
              {d.is_terminal && <div className="text-red-600 text-xs">Terminal Agent · click to inspect</div>}
              <div className="text-slate-500 text-xs mt-1">Total activity: {d.total}</div>
            </div>
          )
        })
      })
      .on('mouseleave', () => setTooltip(null))

    // ── Unified styling: incident filter + node-selection highlight ──
    const eid = e => (e && e.id != null) ? e.id : e
    restyleRef.current = function restyle() {
      const lk = linkElRef.current, nd = nodeElRef.current
      if (!lk || !nd) return
      const f = filterRef.current
      const sel = selectedRef.current
      const md = maxDegRef.current || 1
      const isIncident = INCIDENT_NAMES.includes(f)

      // neighbours of the selected node
      let neigh = null
      if (sel) {
        neigh = new Set([sel])
        lk.each(d => {
          const s = eid(d.source), t = eid(d.target)
          if (s === sel) neigh.add(t)
          else if (t === sel) neigh.add(s)
        })
      }

      const relDeg = d => f === 'all' ? d.degree : f === 'normal' ? (d.incDeg?.normal || 0) : (d.incDeg?.[f] || 0)
      const degOpacity = d => 0.4 + 0.6 * Math.sqrt((d.degree || 0) / md)

      lk
        .attr('stroke', d => {
          if (sel) { const s = eid(d.source), t = eid(d.target); return (s === sel || t === sel) ? baseEdgeColor(d) : '#d4cdc5' }
          return edgeMatchesFilter(d, f) ? baseEdgeColor(d) : '#d4cdc5'
        })
        .attr('opacity', d => {
          if (sel) { const s = eid(d.source), t = eid(d.target); return (s === sel || t === sel) ? 0.95 : 0.05 }
          if (!edgeMatchesFilter(d, f)) return 0.15
          return f === 'all' ? (d.total_anomalous > 0 ? 0.85 : 0.7) : 0.9
        })
        .attr('stroke-width', d => {
          if (sel) { const s = eid(d.source), t = eid(d.target); return (s === sel || t === sel) ? Math.max(1.5, Math.sqrt(d.total_all || 1) * 1.1) : 0.5 }
          if (!edgeMatchesFilter(d, f)) return 0.5
          return f === 'all' ? Math.max(1, Math.sqrt(d.total_all || 1) * 0.7) : Math.max(1.5, Math.sqrt(d.total_all || 1) * 1)
        })

      nd.select('.ov-node-circle')
        .attr('fill', d => {
          const base = DEPT_COLOR(d.dept)
          if (sel) return d.id === sel ? d3.color(base).darker(0.9).formatHex() : base
          if (isIncident && relDeg(d) > 0) return d3.color(base).darker(0.7).formatHex()
          return base
        })
        .attr('fill-opacity', d => {
          if (sel) return neigh.has(d.id) ? 1 : 0.08
          if (!isIncident) return degOpacity(d)
          return relDeg(d) > 0 ? 1 : 0.18
        })
        .attr('stroke-opacity', d => {
          if (sel) return neigh.has(d.id) ? 1 : 0.12
          if (!isIncident) return 1
          return relDeg(d) > 0 ? 1 : 0.25
        })
    }

    // Click on empty canvas clears the node selection
    svg.on('click.deselect', () => {
      if (selectedRef.current != null) { selectedRef.current = null; restyleRef.current?.() }
    })

    selectedRef.current = null      // reset selection on (re)build
    restyleRef.current()            // initial paint

    simulation.on('tick', () => {
      linkEl
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      nodeEl.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => simulation.stop()
  }, [interventionEdges, agentMetrics])

  // Restyle whenever the filter changes (clears any node selection)
  useEffect(() => {
    filterRef.current = filter
    selectedRef.current = null
    restyleRef.current?.()
  }, [filter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6, minHeight: 0 }}>
      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, color: '#a69e91', fontFamily: 'JetBrains Mono, monospace', marginRight: 2 }}>Filter:</span>
        {FILTERS.map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilter(key)} className="chip" style={filter === key ? { background: color + '20', borderColor: color + '60', color: '#2b2823' } : {}}>
            {label}
          </button>
        ))}
      </div>

      {/* Network SVG — fills remaining space */}
      <div ref={wrapRef} style={{ flex: 1, minHeight: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid #e7e1d6', background: '#f8f4ec' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
        {[
          { dash: true, color: '#a69e91', label: 'Normal' },
          { dash: true, color: '#e3c069', label: '1 incident' },
          { dash: true, color: '#d4823a', label: '2 incidents' },
          { dash: true, color: '#e63946', label: 'All 3' },
          { ring: true, color: '#e63946', label: 'John W.' },
          { ring: true, color: '#8a6aa6', label: 'C2 agent' },
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
