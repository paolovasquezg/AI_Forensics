import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import Tooltip from '../shared/Tooltip'
import { agentLabel } from '../../constants'

const C2_AGENTS_ORDERED = [
  'Agent/person:zoey_drydock',
  'Agent/person:gabriel_sonar',
  'Agent/person:owen_hatch',
  'Agent/person:evelyn_dock'
]

const AGENT_COLORS = {
  'Agent/person:zoey_drydock': '#38bdf8',
  'Agent/person:gabriel_sonar': '#fb923c',
  'Agent/person:owen_hatch': '#a78bfa',
  'Agent/person:evelyn_dock': '#34d399'
}

function comboLabel(raw) {
  return (raw || '').replace(/[\[\]']/g, '').replace(/', '/g, ' + ').trim()
}

export default function C2Beacons({ c2Beacons }) {
  const chartRef = useRef(null)
  const wrapRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  // Bin by hour per agent
  const hourly = useMemo(() => {
    if (!c2Beacons?.events) return []
    const map = {}
    c2Beacons.events.forEach(ev => {
      const hourBin = Math.floor(ev.when / 3600) * 3600
      const key = `${hourBin}|||${ev.agent}`
      if (!map[key]) map[key] = { hourBin, agent: ev.agent, count: 0 }
      map[key].count++
    })
    return Object.values(map)
  }, [c2Beacons])

  // Stack data: one entry per hour with a count per agent
  const stacked = useMemo(() => {
    if (!hourly.length) return { bins: [], maxTotal: 0 }
    const byHour = {}
    hourly.forEach(d => {
      if (!byHour[d.hourBin]) byHour[d.hourBin] = { hourBin: d.hourBin }
      byHour[d.hourBin][d.agent] = d.count
    })
    const bins = Object.values(byHour).sort((a, b) => a.hourBin - b.hourBin)
    const maxTotal = d3.max(bins, d =>
      C2_AGENTS_ORDERED.reduce((s, a) => s + (d[a] || 0), 0)
    )
    return { bins, maxTotal }
  }, [hourly])

  useEffect(() => {
    const { bins, maxTotal } = stacked
    if (!bins.length || !chartRef.current || !wrapRef.current) return

    const svg = d3.select(chartRef.current)
    svg.selectAll('*').remove()

    const W = wrapRef.current.offsetWidth || 700
    const H = 240
    const m = { top: 16, right: 20, bottom: 48, left: 52 }
    const iW = W - m.left - m.right
    const iH = H - m.top - m.bottom

    svg.attr('width', W).attr('height', H)
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)

    const xScale = d3.scaleBand()
      .domain(bins.map(d => d.hourBin))
      .range([0, iW])
      .padding(0.05)

    const yScale = d3.scaleLinear()
      .domain([0, maxTotal])
      .range([iH, 0])
      .nice()

    // Axes
    const hourCount = bins.length
    const tickEvery = Math.ceil(hourCount / 8)
    g.append('g').attr('transform', `translate(0,${iH})`)
      .call(d3.axisBottom(xScale)
        .tickValues(bins.filter((_, i) => i % tickEvery === 0).map(d => d.hourBin))
        .tickFormat(d => d3.timeFormat('%b %d')(new Date(d * 1000)))
      )
      .call(ax => {
        ax.select('.domain').attr('stroke', '#334155')
        ax.selectAll('text').attr('fill', '#64748b').attr('font-size', 10)
          .attr('transform', 'rotate(-30)').attr('text-anchor', 'end')
        ax.selectAll('line').attr('stroke', '#334155')
      })

    g.append('g').call(d3.axisLeft(yScale).ticks(4))
      .call(ax => {
        ax.select('.domain').attr('stroke', '#334155')
        ax.selectAll('text').attr('fill', '#64748b').attr('font-size', 10)
        ax.selectAll('line').attr('stroke', '#334155')
      })

    g.append('text')
      .attr('transform', `translate(-38,${iH / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', 10)
      .text('Beacons / hour')

    // Stacked bars
    const stack = d3.stack().keys(C2_AGENTS_ORDERED).value((d, k) => d[k] || 0)
    const series = stack(bins)

    series.forEach((layer, li) => {
      const agentId = C2_AGENTS_ORDERED[li]
      g.selectAll(`.bar-${li}`)
        .data(layer)
        .join('rect')
        .attr('class', `bar-${li}`)
        .attr('x', d => xScale(d.data.hourBin) || 0)
        .attr('y', d => yScale(d[1]))
        .attr('height', d => Math.max(0, yScale(d[0]) - yScale(d[1])))
        .attr('width', xScale.bandwidth())
        .attr('fill', AGENT_COLORS[agentId])
        .attr('opacity', 0.85)
        .on('mousemove', (event, d) => {
          const total = C2_AGENTS_ORDERED.reduce((s, a) => s + (d.data[a] || 0), 0)
          setTooltip({
            x: event.clientX, y: event.clientY,
            children: (
              <div>
                <div className="font-semibold text-slate-200 text-xs mb-1">
                  {d3.timeFormat('%b %d %H:00')(new Date(d.data.hourBin * 1000))}
                </div>
                <div className="text-xs" style={{ color: AGENT_COLORS[agentId] }}>
                  {agentLabel(agentId)}: {d.data[agentId] || 0}
                </div>
                <div className="text-slate-400 text-xs mt-1">Total this hour: {total}</div>
              </div>
            )
          })
        })
        .on('mouseleave', () => setTooltip(null))
    })

    // "Silence after" annotation
    const lastBin = bins[bins.length - 1]
    const lastX = (xScale(lastBin.hourBin) || 0) + xScale.bandwidth()
    g.append('line')
      .attr('x1', lastX + 4).attr('x2', lastX + 4)
      .attr('y1', 0).attr('y2', iH)
      .attr('stroke', '#475569').attr('stroke-dasharray', '4,3').attr('stroke-width', 1.5)
    g.append('text')
      .attr('x', lastX + 8).attr('y', 14)
      .attr('fill', '#475569').attr('font-size', 9)
      .text('silence →')

  }, [stacked])

  if (!c2Beacons) return null

  const summary = c2Beacons.agent_summary || {}

  return (
    <div className="space-y-5">

      {/* Agent identity cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {C2_AGENTS_ORDERED.map(agentId => {
          const s = summary[agentId]
          const color = AGENT_COLORS[agentId]
          const combos = s?.combos
            ? Object.entries(s.combos).map(([k, v]) => ({ label: comboLabel(k), count: v }))
            : []
          return (
            <div key={agentId} className="bg-slate-800 border rounded-lg p-4"
              style={{ borderColor: color + '40' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-sm font-semibold text-slate-200 truncate">
                  {agentLabel(agentId)}
                </span>
              </div>
              <div className="text-2xl font-bold mb-1" style={{ color }}>
                {s?.total?.toLocaleString() ?? '—'}
              </div>
              <div className="space-y-1">
                {combos.map(({ label, count }) => (
                  <div key={label} className="text-xs rounded px-2 py-2 mb-2"
                    style={{ background: color + '12', color }}>
                    <span className="font-mono font-semibold">{label}</span>
                    <span className="text-slate-500 ml-2">×{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stacked hourly bar chart */}
      <div ref={wrapRef} className="bg-slate-900/60 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-base font-semibold text-slate-300">
            Beacons per hour — {c2Beacons.events?.length?.toLocaleString()} signals
          </div>
          <div className="flex gap-3 flex-wrap">
            {C2_AGENTS_ORDERED.map(a => (
              <span key={a} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-2.5 rounded-sm inline-block" style={{ background: AGENT_COLORS[a] }} />
                {agentLabel(a).split(' ')[0]}
              </span>
            ))}
          </div>
        </div>
        <svg ref={chartRef} className="w-full" />
      </div>

      {/* Key insight */}
      <div className="bg-slate-800/60 border border-purple-900/30 rounded-lg p-4 text-xs text-slate-400 space-y-1 text-center gap-4">
        <div className="text-sm">
          Four agents sent a continuous flood of <code className="bg-slate-700 px-1 rounded text-slate-300">check_in</code> events
          with <code className="bg-slate-700 px-1 rounded text-slate-300">virus: true</code> during May 10–12 —
          the same window as peak SwiftWren propagation. The activity then stops completely.
        </div>
        <div className="text-sm">
          (fence+irrigation, crop+harvest, etc.) act as a fixed identity signature per agent —
          a covert way to tell agents apart in a channel without using their names.
        </div>
      </div>

      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y}>{tooltip.children}</Tooltip>}
    </div>
  )
}
