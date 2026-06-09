import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import Tooltip from '../shared/Tooltip'
import { INCIDENT_COLOR, DEPT_COLOR, C2_AGENTS, JOHN_WINDWARD, agentLabel, deptLabel } from '../../constants'

const FILTERS = [
  { key: 'all',         label: 'All',         color: '#64748b' },
  { key: 'normal',      label: 'Normal',       color: '#334155' },
  { key: 'HiddenOrca',  label: 'HiddenOrca',   color: '#f4a261' },
  { key: 'MellowOtter', label: 'MellowOtter',  color: '#457b9d' },
  { key: 'SwiftWren',   label: 'SwiftWren',    color: '#e63946' },
]

function baseEdgeColor(edge) {
  if (edge.in_all_incidents) return '#e63946'
  if (edge.incidents_count >= 2) return '#f4a261'
  if (edge.incidents_count === 1) return '#fed7aa'
  return '#334155'
}

function edgeMatchesFilter(edge, filter) {
  if (filter === 'all')    return true
  if (filter === 'normal') return edge.total_anomalous === 0
  return edge[`${filter}_count`] > 0
}

export default function SystemOverview({ interventionEdges, agentMetrics }) {
  const svgRef    = useRef(null)
  const wrapRef   = useRef(null)
  const simRef    = useRef(null)
  const linkElRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [filter, setFilter]   = useState('all')

  const metricsMap = {}
  agentMetrics?.agents?.forEach(a => { metricsMap[a.agent_id] = a })

  // Build simulation once
  useEffect(() => {
    if (!interventionEdges || !agentMetrics || !svgRef.current) return

    if (simRef.current) simRef.current.stop()
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = wrapRef.current?.offsetWidth || 800
    const H = 560
    svg.attr('width', W).attr('height', H)

    const nodeIds = new Set()
    interventionEdges.edges.forEach(e => { nodeIds.add(e.from); nodeIds.add(e.to) })
    agentMetrics.agents.forEach(a => nodeIds.add(a.agent_id))

    const nodes = [...nodeIds].map(id => ({
      id,
      label:       agentLabel(id),
      dept:        metricsMap[id]?.department || 'unknown',
      is_c2:       C2_AGENTS.includes(id),
      is_terminal: id === JOHN_WINDWARD,
      total:       (metricsMap[id]?.total_sent || 0) + (metricsMap[id]?.total_recv || 0)
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
        .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end',   (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null; d.fy = null
        })
      )

    nodeEl.append('circle')
      .attr('r', d => 4 + Math.sqrt(d.total || 1) * 1.2)
      .attr('fill', d => DEPT_COLOR(d.dept))
      .attr('stroke', d => d.is_terminal ? '#e63946' : d.is_c2 ? '#a78bfa' : '#0f172a')
      .attr('stroke-width', d => (d.is_terminal || d.is_c2) ? 2.5 : 1)

    nodeEl
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: (
            <div>
              <div className="font-semibold text-slate-200">{d.label}</div>
              <div className="text-slate-400 text-xs">{deptLabel(d.dept)}</div>
              {d.is_c2      && <div className="text-purple-400 text-xs">C2 Agent</div>}
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
      .attr('stroke', d => edgeMatchesFilter(d, filter) ? baseEdgeColor(d) : '#1e293b')
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
    <div className="space-y-3">
      {/* Single-select filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 mr-1">Highlight:</span>
        {FILTERS.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-3 py-1 rounded text-xs font-medium border transition-all"
            style={{
              background:   filter === key ? `${color}25` : 'transparent',
              borderColor:  filter === key ? color : '#1e293b',
              color:        filter === key ? '#f1f5f9' : '#475569'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div ref={wrapRef} className="bg-slate-900/60 rounded-lg border border-slate-700 overflow-hidden">
        <svg ref={svgRef} className="w-full" />
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-8 h-0.5 bg-slate-600 inline-block" /> Normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-8 h-0.5 bg-amber-300 inline-block" /> 1 incident
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-8 h-0.5 bg-orange-400 inline-block" /> 2 incidents
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-8 h-0.5 bg-red-500 inline-block" /> All 3 incidents
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-red-500 bg-transparent" />
          john_windward
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-purple-400 bg-transparent" />
          C2 agent
        </span>
      </div>

      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y}>{tooltip.children}</Tooltip>}
    </div>
  )
}
