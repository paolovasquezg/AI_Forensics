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
  'Agent/person:zoey_drydock':  '#38bdf8',
  'Agent/person:gabriel_sonar': '#fb923c',
  'Agent/person:owen_hatch':    '#a78bfa',
  'Agent/person:evelyn_dock':   '#34d399'
}

function comboLabel(raw) {
  return (raw || '').replace(/[\[\]']/g, '').replace(/', '/g, ' + ').trim()
}

export default function C2Beacons({ c2Beacons }) {
  const chartRef = useRef(null)
  const wrapRef  = useRef(null)
  const [tooltip, setTooltip] = useState(null)

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

  const stacked = useMemo(() => {
    if (!hourly.length) return { bins: [], maxTotal: 0 }
    const byHour = {}
    hourly.forEach(d => {
      if (!byHour[d.hourBin]) byHour[d.hourBin] = { hourBin: d.hourBin }
      byHour[d.hourBin][d.agent] = d.count
    })
    const bins = Object.values(byHour).sort((a, b) => a.hourBin - b.hourBin)
    const maxTotal = d3.max(bins, d => C2_AGENTS_ORDERED.reduce((s, a) => s + (d[a] || 0), 0))
    return { bins, maxTotal }
  }, [hourly])

  useEffect(() => {
    const { bins, maxTotal } = stacked
    if (!bins.length || !chartRef.current || !wrapRef.current) return

    const svg = d3.select(chartRef.current)
    svg.selectAll('*').remove()

    const W = wrapRef.current.offsetWidth || 600
    const H = wrapRef.current.offsetHeight || 180
    const m = { top: 10, right: 16, bottom: 42, left: 46 }
    const iW = W - m.left - m.right
    const iH = H - m.top - m.bottom

    svg.attr('width', W).attr('height', H)
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)

    const xScale = d3.scaleBand().domain(bins.map(d => d.hourBin)).range([0, iW]).padding(0.05)
    const yScale = d3.scaleLinear().domain([0, maxTotal]).range([iH, 0]).nice()

    const hourCount = bins.length
    const tickEvery = Math.ceil(hourCount / 7)
    g.append('g').attr('transform', `translate(0,${iH})`)
      .call(d3.axisBottom(xScale)
        .tickValues(bins.filter((_, i) => i % tickEvery === 0).map(d => d.hourBin))
        .tickFormat(d => d3.timeFormat('%b %d')(new Date(d * 1000)))
      )
      .call(ax => {
        ax.select('.domain').attr('stroke', '#0d1e34')
        ax.selectAll('text').attr('fill', '#2d4a6a').attr('font-size', 9)
          .attr('transform', 'rotate(-30)').attr('text-anchor', 'end')
        ax.selectAll('line').attr('stroke', '#0d1e34')
      })

    g.append('g').call(d3.axisLeft(yScale).ticks(4))
      .call(ax => {
        ax.select('.domain').attr('stroke', '#0d1e34')
        ax.selectAll('text').attr('fill', '#2d4a6a').attr('font-size', 9)
        ax.selectAll('line').attr('stroke', '#0d1e34')
      })

    g.append('text')
      .attr('transform', `translate(-34,${iH / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle').attr('fill', '#2d4a6a').attr('font-size', 9)
      .text('beacons / hr')

    const stack = d3.stack().keys(C2_AGENTS_ORDERED).value((d, k) => d[k] || 0)
    const series = stack(bins)

    series.forEach((layer, li) => {
      const agentId = C2_AGENTS_ORDERED[li]
      g.selectAll(`.bar-${li}`)
        .data(layer).join('rect')
        .attr('class', `bar-${li}`)
        .attr('x',      d => xScale(d.data.hourBin) || 0)
        .attr('y',      d => yScale(d[1]))
        .attr('height', d => Math.max(0, yScale(d[0]) - yScale(d[1])))
        .attr('width',  xScale.bandwidth())
        .attr('fill',   AGENT_COLORS[agentId])
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
                <div className="text-slate-400 text-xs mt-1">Total: {total}</div>
              </div>
            )
          })
        })
        .on('mouseleave', () => setTooltip(null))
    })

    // silence marker
    const lastBin = bins[bins.length - 1]
    const lastX = (xScale(lastBin.hourBin) || 0) + xScale.bandwidth()
    g.append('line')
      .attr('x1', lastX + 3).attr('x2', lastX + 3)
      .attr('y1', 0).attr('y2', iH)
      .attr('stroke', '#2d4a6a').attr('stroke-dasharray', '3,3').attr('stroke-width', 1.5)
    g.append('text')
      .attr('x', lastX + 6).attr('y', 12)
      .attr('fill', '#2d4a6a').attr('font-size', 8)
      .text('silence →')

  }, [stacked])

  if (!c2Beacons) return null

  const summary = c2Beacons.agent_summary || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10, minHeight: 0 }}>

      {/* Agent cards — compact 2×2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flexShrink: 0 }}>
        {C2_AGENTS_ORDERED.map(agentId => {
          const s = summary[agentId]
          const color = AGENT_COLORS[agentId]
          const combos = s?.combos
            ? Object.entries(s.combos).slice(0, 2).map(([k, v]) => ({ label: comboLabel(k), count: v }))
            : []
          return (
            <div key={agentId} style={{
              background: '#060e1b',
              border: `1px solid ${color}30`,
              borderRadius: 7, padding: '8px 10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {agentLabel(agentId)}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                {s?.total?.toLocaleString() ?? '—'}
              </div>
              {combos.map(({ label, count }) => (
                <div key={label} style={{
                  fontSize: 9, marginTop: 3, padding: '2px 5px',
                  background: color + '10', color,
                  borderRadius: 3, fontFamily: 'JetBrains Mono, monospace',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {label} <span style={{ color: '#2d4a6a' }}>×{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
        {C2_AGENTS_ORDERED.map(a => (
          <div key={a} className="legend-item">
            <span style={{ display: 'inline-block', width: 10, height: 7, borderRadius: 2, background: AGENT_COLORS[a] }} />
            {agentLabel(a).split(' ')[0]}
          </div>
        ))}
      </div>

      {/* Chart — fills remaining space */}
      <div ref={wrapRef} style={{
        flex: 1, minHeight: 0,
        background: '#060e1b', border: '1px solid #0d1e34',
        borderRadius: 7, padding: '8px 8px 4px',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ fontSize: 9, color: '#2d4a6a', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
          BEACONS PER HOUR — {c2Beacons.events?.length?.toLocaleString()} total signals
        </div>
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <svg ref={chartRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
      </div>

      {/* Insight */}
      <div style={{
        flexShrink: 0, padding: '8px 12px',
        background: '#060e1b', border: '1px solid #1a0d2e',
        borderLeft: '2px solid #a78bfa',
        borderRadius: '0 6px 6px 0', fontSize: 10, color: '#4a7098', lineHeight: 1.5,
      }}>
        Four agents sent <code style={{ background: '#0d1e34', borderRadius: 3, padding: '1px 4px', color: '#93c5fd', fontFamily: 'JetBrains Mono, monospace' }}>check_in</code> events
        with <code style={{ background: '#0d1e34', borderRadius: 3, padding: '1px 4px', color: '#93c5fd', fontFamily: 'JetBrains Mono, monospace' }}>virus: true</code> during May 10–12, coinciding exactly with SwiftWren propagation, then stopped completely.
      </div>

      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y}>{tooltip.children}</Tooltip>}
    </div>
  )
}
