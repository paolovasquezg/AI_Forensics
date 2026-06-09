import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import Tooltip from '../shared/Tooltip'
import { INCIDENT_COLOR, agentLabel, shortDate } from '../../constants'

export default function IncidentTimeline({ chains, selectedIncident, onIncidentChange }) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    if (!chains || !svgRef.current || !wrapRef.current) return
    const incident = chains[selectedIncident]
    if (!incident) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = wrapRef.current.offsetWidth || 700
    const H = Math.min(600, Math.max(350, incident.hop_count * 2.5 + 120))
    const m = { top: 40, right: 40, bottom: 50, left: 70 }
    const iW = W - m.left - m.right
    const iH = H - m.top - m.bottom

    svg.attr('width', W).attr('height', H)

    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)

    // Background grid
    g.append('rect').attr('width', iW).attr('height', iH)
      .attr('fill', 'rgba(15,23,42,0.4)').attr('rx', 4)

    const allTimes = incident.hops.map(h => new Date(h.datetime))
    if (incident.create_event) allTimes.push(new Date(incident.create_event.datetime))
    if (incident.post_event)   allTimes.push(new Date(incident.post_event.datetime))
    incident.delete_events?.forEach(d => allTimes.push(new Date(d.datetime || incident.post_event.datetime)))

    const xScale = d3.scaleTime()
      .domain([
        d3.min(allTimes),
        d3.max(allTimes)
      ])
      .range([0, iW])
      .nice()

    const maxDepth = incident.hop_count
    const yScale = d3.scaleLinear().domain([0, maxDepth + 2]).range([0, iH])

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%b %d'))
    const yAxis = d3.axisLeft(yScale).ticks(Math.min(10, maxDepth)).tickFormat(d => d > 0 && d <= maxDepth ? `Hop ${d}` : '')

    g.append('g').attr('transform', `translate(0,${iH})`)
      .call(xAxis)
      .call(ax => ax.select('.domain').attr('stroke', '#334155'))
      .call(ax => ax.selectAll('line').attr('stroke', '#1e293b'))
      .call(ax => ax.selectAll('text').attr('fill', '#64748b').attr('font-size', 11))

    g.append('g').call(yAxis)
      .call(ax => ax.select('.domain').attr('stroke', '#334155'))
      .call(ax => ax.selectAll('line').attr('stroke', '#1e293b'))
      .call(ax => ax.selectAll('text').attr('fill', '#64748b').attr('font-size', 10))

    // Horizontal grid lines
    g.append('g').selectAll('line')
      .data(yScale.ticks(Math.min(10, maxDepth)))
      .join('line')
      .attr('x1', 0).attr('x2', iW)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', '#1e293b').attr('stroke-dasharray', '3,3')

    // Agent color scale
    const uniqueAgents = [...new Set(incident.hops.map(h => h.from))]
    const agentColors = d3.scaleOrdinal(d3.schemeTableau10).domain(uniqueAgents)

    // Lines connecting hops
    if (incident.hops.length > 1) {
      const lineGen = d3.line()
        .x(d => xScale(new Date(d.datetime)))
        .y(d => yScale(d.depth))
        .curve(d3.curveCatmullRom)

      g.append('path')
        .datum(incident.hops)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', `${INCIDENT_COLOR[selectedIncident]}30`)
        .attr('stroke-width', 1.5)
    }

    // Hop circles
    g.selectAll('.hop')
      .data(incident.hops)
      .join('circle')
      .attr('class', 'hop')
      .attr('cx', d => xScale(new Date(d.datetime)))
      .attr('cy', d => yScale(d.depth))
      .attr('r', 5)
      .attr('fill', d => agentColors(d.from))
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1)
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: (
            <div>
              <div className="font-semibold text-slate-200 mb-1">Hop {d.depth}</div>
              <div className="text-slate-400">From: <span className="text-slate-200">{agentLabel(d.from)}</span></div>
              <div className="text-slate-400">To: <span className="text-slate-200">{agentLabel(d.to)}</span></div>
              <div className="text-slate-400 mt-1">{d.datetime}</div>
              <div className="text-slate-500 text-xs">Event #{d.event_id}</div>
            </div>
          )
        })
      })
      .on('mouseleave', () => setTooltip(null))

    // Special markers
    if (incident.create_event) {
      const cx = xScale(new Date(incident.create_event.datetime))
      const cy = yScale(0.5)
      g.append('polygon')
        .attr('points', `${cx},${cy - 9} ${cx + 8},${cy + 5} ${cx - 8},${cy + 5}`)
        .attr('fill', '#22c55e')
        .attr('stroke', '#0f172a').attr('stroke-width', 1.5)
      g.append('text')
        .attr('x', cx + 10).attr('y', cy + 2)
        .attr('fill', '#22c55e').attr('font-size', 10)
        .text('CREATE')
    }

    if (incident.post_event) {
      const px = xScale(new Date(incident.post_event.datetime))
      const py = yScale(maxDepth + 0.8)
      g.append('circle').attr('cx', px).attr('cy', py).attr('r', 9)
        .attr('fill', '#e63946').attr('stroke', '#0f172a').attr('stroke-width', 2)
      g.append('text').attr('x', px + 12).attr('y', py + 4)
        .attr('fill', '#e63946').attr('font-size', 10).text('POST')

      g.append('line')
        .attr('x1', px).attr('x2', px).attr('y1', 0).attr('y2', iH)
        .attr('stroke', '#e6394640').attr('stroke-dasharray', '4,3')
    }

    if (incident.delete_events?.length) {
      const dt = incident.delete_events[0]
      const refTime = incident.post_event?.datetime
      if (refTime) {
        const dx = xScale(new Date(refTime)) + 8
        const dy = yScale(maxDepth + 1.5)
        g.append('text').attr('x', dx).attr('y', dy + 4)
          .attr('fill', '#94a3b8').attr('font-size', 13).attr('font-weight', 'bold')
          .text('✕ DELETE')
      }
    }

    // Chart title
    g.append('text')
      .attr('x', iW / 2).attr('y', -16)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1').attr('font-size', 13).attr('font-weight', 'bold')
      .text(`${selectedIncident} — Propagation Chain (${incident.hop_count} hops)`)

    // Agent legend (up to 10)
    const legendAgents = uniqueAgents.slice(0, 10)
    const legend = g.append('g').attr('transform', `translate(${iW - 160}, 4)`)
    legendAgents.forEach((a, i) => {
      legend.append('circle').attr('cx', 0).attr('cy', i * 14).attr('r', 4).attr('fill', agentColors(a))
      legend.append('text').attr('x', 8).attr('y', i * 14 + 4)
        .attr('fill', '#64748b').attr('font-size', 9)
        .text(agentLabel(a).split(' ')[0])
    })

  }, [chains, selectedIncident])

  const incident = chains?.[selectedIncident]

  return (
    <div className="space-y-4">
      {/* Incident selector tabs */}
      <div className="flex gap-2">
        {['HiddenOrca', 'MellowOtter', 'SwiftWren'].map(n => (
          <button
            key={n}
            onClick={() => onIncidentChange(n)}
            className="px-4 py-1.5 rounded text-xs font-semibold transition-all border"
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

      <div className="flex gap-4">
        {/* Main chart */}
        <div ref={wrapRef} className="flex-1 bg-slate-900/60 rounded-lg border border-slate-700 p-2 overflow-x-auto">
          <svg ref={svgRef} />
        </div>

        {/* Stats panel */}
        {incident && (
          <div className="w-52 shrink-0 space-y-3">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Incident Stats</div>
              {[
                ['Hops',     incident.hop_count],
                ['Duration', `${incident.duration_hours.toFixed(1)} h`],
                ['Agents',   incident.agents_count],
                ['Origin',   agentLabel(incident.origin_agent)],
                ['Start',    shortDate(incident.start_datetime)],
                ['Post',     shortDate(incident.post_event?.datetime)]
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs py-1 border-b border-slate-700/50">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-200 font-medium text-right max-w-[100px] truncate">{v}</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Agents Involved</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {incident.agents_involved.map(a => (
                  <div key={a} className="text-xs text-slate-400 truncate">{agentLabel(a)}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y}>{tooltip.children}</Tooltip>}
    </div>
  )
}
