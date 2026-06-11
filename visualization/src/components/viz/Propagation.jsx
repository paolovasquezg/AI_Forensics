import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import Tooltip from '../shared/Tooltip'
import { INCIDENT_COLOR, DEPT_COLOR, DEPT_IDS, DEPT_LABELS, C2_AGENTS, JOHN_WINDWARD, agentLabel, deptLabel } from '../../constants'

export default function PropagationNetwork({ chains, agentMetrics, selectedIncident, onIncidentChange }) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [showLabels, setShowLabels] = useState(true)

  const metricsMap = {}
  agentMetrics?.agents?.forEach(a => { metricsMap[a.agent_id] = a })

  useEffect(() => {
    if (!chains || !agentMetrics || !svgRef.current) return
    const incident = chains[selectedIncident]
    if (!incident) return

    if (simRef.current) simRef.current.stop()
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = wrapRef.current?.offsetWidth
    const H = 700
    svg.attr('width', W).attr('height', H)

    // Build graph from hops
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

    const originId = incident.origin_agent
    const terminalId = JOHN_WINDWARD

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(90).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(d => 12 + Math.sqrt(d.participation) * 2))
    simRef.current = simulation

    const defs = svg.append('defs')
    defs.append('marker').attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10').attr('refX', 20).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#475569')

    const linkEl = svg.append('g').selectAll('line')
      .data(links).join('line')
      .attr('stroke', '#334155')
      .attr('stroke-width', d => Math.max(1, Math.sqrt(d.count) * 1.5))
      .attr('opacity', 0.55)
      .attr('marker-end', 'url(#arrow)')

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
      .attr('r', d => 8 + Math.sqrt(d.participation) * 2)
      .attr('fill', d => DEPT_COLOR(d.dept))
      .attr('stroke', d => {
        if (d.id === terminalId) return '#e63946'
        if (d.id === originId) return '#22c55e'
        if (d.is_c2) return '#a78bfa'
        return '#0f172a'
      })
      .attr('stroke-width', d => (d.id === terminalId || d.id === originId || d.is_c2) ? 3 : 1.5)

    // C2 ring
    nodeEl.filter(d => d.is_c2)
      .append('circle')
      .attr('r', d => 12 + Math.sqrt(d.participation) * 2)
      .attr('fill', 'none')
      .attr('stroke', '#a78bfa')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.6)

    const labelEl = nodeEl.append('text')
      .attr('class', 'node-label')
      .attr('dy', d => -(10 + Math.sqrt(d.participation) * 2))
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', '#94a3b8')
      .text(d => d.label.split(' ')[0])
      .attr('visibility', showLabels ? 'visible' : 'hidden')

    nodeEl
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: (
            <div>
              <div className="font-semibold text-slate-200">{d.label}</div>
              <div className="text-slate-400 text-xs">{deptLabel(d.dept)}</div>
              {d.is_c2 && <div className="text-purple-400 text-xs font-semibold mt-1">C2 Agent</div>}
              <div className="text-slate-400 text-xs mt-1">Participation: {d.participation} events</div>
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
  }, [chains, agentMetrics, selectedIncident])

  useEffect(() => {
    if (!svgRef.current) return
    d3.select(svgRef.current).selectAll('.node-label')
      .attr('visibility', showLabels ? 'visible' : 'hidden')
  }, [showLabels])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['HiddenOrca', 'MellowOtter', 'SwiftWren'].map(n => (
            <button
              key={n}
              onClick={() => onIncidentChange(n)}
              className="px-3 py-1 rounded text-xs font-semibold border transition-all"
              style={{
                background: selectedIncident === n ? `${INCIDENT_COLOR[n]}20` : 'transparent',
                borderColor: selectedIncident === n ? INCIDENT_COLOR[n] : '#334155',
                color: selectedIncident === n ? '#f1f5f9' : '#64748b'
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowLabels(l => !l)}
          className="px-3 py-1 rounded text-xs border border-slate-600 text-slate-400 hover:text-slate-200"
        >
          {showLabels ? 'Hide Labels' : 'Show Labels'}
        </button>
      </div>

      <div ref={wrapRef} className="bg-slate-900/60 rounded-lg border border-slate-700 overflow-hidden">
        <svg ref={svgRef} className="w-full" />
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-green-500 bg-transparent" />
          Origin agent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-red-500 bg-transparent" />
          Terminal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-purple-400 bg-transparent" />
          Beacon agent
        </span>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-1">
        <span className="text-slate-400 font-medium">Node color by dept:</span>
        {DEPT_IDS.map(id => (
          <span key={id} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: DEPT_COLOR(id) }} />
            {DEPT_LABELS[id]}
          </span>
        ))}
      </div>

      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y}>{tooltip.children}</Tooltip>}
    </div>
  )
}
