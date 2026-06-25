import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import Tooltip from './Tooltip'
import { INCIDENT_COLOR, agentLabel } from '../constants'

const INCIDENTS = ['HiddenOrca', 'MellowOtter', 'SwiftWren']

export default function Intervention({ Interventions: interventionEdges }) {
  const chartRef = useRef(null)
  const wrapRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  const edges = interventionEdges?.edges || []
  const top = [...edges]
    .filter(e => e.total_anomalous > 0)
    .sort((a, b) => b.total_anomalous - a.total_anomalous)
    .slice(0, 10)

  const best = [...edges]
    .filter(e => e.total_anomalous > 0)
    .sort((a, b) => b.intervention_score - a.intervention_score)[0]

  // Stacked horizontal bar chart
  useEffect(() => {
    if (!top.length || !chartRef.current || !wrapRef.current) return

    const svg = d3.select(chartRef.current)
    svg.selectAll('*').remove()

    const W = wrapRef.current.offsetWidth || 700
    const ROW = 26
    const H = top.length * ROW + 50
    const m = { top: 10, right: 100, bottom: 36, left: 170 }
    const iW = W - m.left - m.right

    svg.attr('width', W).attr('height', H)
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)

    const maxAnom = d3.max(top, d => d.total_anomalous)
    const xScale = d3.scaleLinear().domain([0, maxAnom]).range([0, iW]).nice()
    const yScale = d3.scaleBand().domain(top.map((_, i) => i)).range([0, top.length * ROW]).padding(0.25)

    g.append('g').attr('transform', `translate(0,${top.length * ROW})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d} uses`))
      .call(ax => {
        ax.select('.domain').attr('stroke', '#e7e1d6')
        ax.selectAll('text').attr('fill', '#7d766b').attr('font-size', 10)
        ax.selectAll('line').attr('stroke', '#efeae0')
      })

    const rowG = g.selectAll('.row')
      .data(top).join('g').attr('class', 'row')

    // Agent label (left)
    rowG.append('text')
      .attr('x', -8)
      .attr('y', (_, i) => yScale(i) + yScale.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('fill', '#4d4842')
      .attr('font-size', 10)
      .text(d => `${agentLabel(d.from).split(' ')[0]} → ${agentLabel(d.to).split(' ')[0]}`)

    // Stacked bars (one segment per incident)
    INCIDENTS.forEach(inc => {
      const key = `${inc}_count`
      // compute x offsets for stacking
      rowG.each(function (d, i) {
        const prev = INCIDENTS.slice(0, INCIDENTS.indexOf(inc))
          .reduce((sum, p) => sum + (d[`${p}_count`] || 0), 0)
        const val = d[key] || 0
        if (!val) return
        d3.select(this).append('rect')
          .attr('x', xScale(prev))
          .attr('y', yScale(i))
          .attr('width', xScale(val))
          .attr('height', yScale.bandwidth())
          .attr('fill', INCIDENT_COLOR[inc])
          .attr('rx', 2)
          .attr('opacity', 0.85)
          .on('mousemove', (event) => {
            setTooltip({
              x: event.clientX, y: event.clientY,
              children: (
                <div>
                  <div className="font-semibold text-slate-800 text-xs mb-1">
                    {agentLabel(d.from)} → {agentLabel(d.to)}
                  </div>
                  <div className="text-slate-600 text-xs">{inc}: {val} uses</div>
                  <div className="text-slate-600 text-xs">Total anomalous: {d.total_anomalous}</div>
                  <div className="text-slate-600 text-xs">Normal ops: {d.normal_count}</div>
                </div>
              )
            })
          })
          .on('mouseleave', () => setTooltip(null))
      })
    })

    // "Safe to block" badge (right side)
    rowG.append('text')
      .attr('x', xScale(maxAnom) + 8)
      .attr('y', (_, i) => yScale(i) + yScale.bandwidth() / 2 + 4)
      .attr('fill', d => d.normal_count === 0 ? '#5f8a4e' : '#cf9a3c')
      .attr('font-size', 9)
      .attr('font-weight', 'bold')
      .text(d => d.normal_count === 0 ? '✓ safe' : `${d.normal_count} norm`)

  }, [top])

  return (
    <div className="space-y-3">

      {/* Top recommendation card */}
      {best && (
        <div style={{ background: '#fdf2f0', border: '1px solid #f5cdc7', borderLeft: '2px solid #e63946', borderRadius: 6, padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 8, color: '#a69e91', fontFamily: 'JetBrains Mono,monospace', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Top recommendation</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2b2823' }}>
              <span style={{ color: '#e63946' }}>{agentLabel(best.from)}</span>
              <span style={{ color: '#a69e91', margin: '0 5px' }}>→</span>
              <span style={{ color: '#e63946' }}>{agentLabel(best.to)}</span>
            </div>
            {best.normal_count === 0 && (
              <div style={{ fontSize: 9, color: '#5f8a4e', fontFamily: 'JetBrains Mono,monospace', marginTop: 2 }}>✓ zero normal ops affected</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, textAlign: 'center', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#e63946', fontFamily: 'JetBrains Mono,monospace', lineHeight: 1 }}>{best.total_anomalous}</div>
              <div style={{ fontSize: 8, color: '#a69e91', marginTop: 2 }}>anomalous</div>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#4d4842', fontFamily: 'JetBrains Mono,monospace', lineHeight: 1 }}>{best.incidents_count}</div>
              <div style={{ fontSize: 8, color: '#a69e91', marginTop: 2 }}>incidents</div>
            </div>
          </div>
        </div>
      )}

      {/* Stacked bar chart */}
      <div ref={wrapRef} style={{ background: '#fdfbf7', borderRadius: 6, border: '1px solid #e7e1d6', padding: '8px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#7d766b', fontFamily: 'JetBrains Mono,monospace', textTransform: 'uppercase', letterSpacing: '.08em' }}>Top 10 candidate edges</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {INCIDENTS.map(inc => (
              <span key={inc} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#7d766b', fontFamily: 'JetBrains Mono,monospace' }}>
                <span style={{ width: 10, height: 8, borderRadius: 2, display: 'inline-block', background: INCIDENT_COLOR[inc] }} />
                {inc}
              </span>
            ))}
          </div>
        </div>
        <svg ref={chartRef} style={{ width: '100%', display: 'block' }} />
      </div>

      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y}>{tooltip.children}</Tooltip>}
    </div>
  )
}
