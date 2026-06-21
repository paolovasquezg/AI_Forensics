import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import Tooltip from '../shared/Tooltip'
import { INCIDENT_COLOR, agentLabel } from '../../constants'

const INCIDENTS = ['HiddenOrca', 'MellowOtter', 'SwiftWren']

export default function InterventionRecommender({ interventionEdges }) {
  const chartRef = useRef(null)
  const wrapRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [selected, setSelected] = useState(null)

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
    const ROW = 34
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
        ax.select('.domain').attr('stroke', '#0f1f35')
        ax.selectAll('text').attr('fill', '#64748b').attr('font-size', 10)
        ax.selectAll('line').attr('stroke', '#060e1c')
      })

    const rowG = g.selectAll('.row')
      .data(top).join('g').attr('class', 'row')
      .style('cursor', 'pointer')
      .on('click', (_, d) => setSelected(prev => prev === d ? null : d))

    // Row background on hover
    rowG.append('rect')
      .attr('x', -m.left).attr('y', (_, i) => yScale(i) - 2)
      .attr('width', W).attr('height', yScale.bandwidth() + 4)
      .attr('fill', 'transparent')
      .on('mouseover', function () { d3.select(this).attr('fill', 'rgba(13,24,41,0.6)') })
      .on('mouseout', function () { d3.select(this).attr('fill', 'transparent') })

    // Agent label (left)
    rowG.append('text')
      .attr('x', -8)
      .attr('y', (_, i) => yScale(i) + yScale.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('fill', (d) => selected === d ? '#f1f5f9' : '#94a3b8')
      .attr('font-size', 10)
      .attr('font-weight', (d) => selected === d ? 'bold' : 'normal')
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
                  <div className="font-semibold text-slate-200 text-xs mb-1">
                    {agentLabel(d.from)} → {agentLabel(d.to)}
                  </div>
                  <div className="text-slate-400 text-xs">{inc}: {val} uses</div>
                  <div className="text-slate-400 text-xs">Total anomalous: {d.total_anomalous}</div>
                  <div className="text-slate-400 text-xs">Normal ops: {d.normal_count}</div>
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
      .attr('fill', d => d.normal_count === 0 ? '#22c55e' : '#f59e0b')
      .attr('font-size', 9)
      .attr('font-weight', 'bold')
      .text(d => d.normal_count === 0 ? '✓ safe' : `${d.normal_count} norm`)

    // Selection indicator
    rowG.append('rect')
      .attr('x', -m.left + 2).attr('y', (_, i) => yScale(i))
      .attr('width', 3).attr('height', yScale.bandwidth())
      .attr('fill', d => selected === d ? '#e63946' : 'transparent')
      .attr('rx', 1)

  }, [top, selected])

  const detail = selected || best

  return (
    <div className="space-y-5">

      {/* Top recommendation card */}
      {best && (
        <div className="bg-[#090f1c] border border-red-900/30 rounded-lg p-5 border-l-2 border-l-red-700/60">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">Top recommendation</div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-lg font-bold text-slate-100">
                <span className="text-red-400">{agentLabel(best.from)}</span>
                <span className="text-slate-500 mx-2">→</span>
                <span className="text-red-400">{agentLabel(best.to)}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {INCIDENTS.map(inc => best[`${inc}_count`] > 0 && (
                  <span key={inc} className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: INCIDENT_COLOR[inc] + '25', color: INCIDENT_COLOR[inc], border: `1px solid ${INCIDENT_COLOR[inc]}60` }}>
                    {inc} ×{best[`${inc}_count`]}
                  </span>
                ))}
                {best.normal_count === 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-950 text-green-400 border border-green-800">
                    ✓ zero normal ops affected
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-6 text-center shrink-0">
              <div>
                <div className="text-2xl font-bold text-red-400">{best.total_anomalous}</div>
                <div className="text-xs text-slate-500">Anomalous uses</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-200">{best.incidents_count}</div>
                <div className="text-xs text-slate-500">Incidents covered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-200">{best.normal_count}</div>
                <div className="text-xs text-slate-500">Normal ops cost</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stacked bar chart */}
      <div ref={wrapRef} className="bg-slate-900/40 rounded-lg border border-slate-800/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-base font-semibold text-slate-300">Top 10 candidate edges</div>
          <div className="flex gap-3">
            {INCIDENTS.map(inc => (
              <span key={inc} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-2.5 rounded-sm inline-block" style={{ background: INCIDENT_COLOR[inc] }} />
                {inc}
              </span>
            ))}
          </div>
        </div>
        <svg ref={chartRef} className="w-full" />
      </div>

      {detail && (
        <div className="bg-slate-900/80 border border-slate-800/60 rounded-lg p-4 space-y-3">
          <div className="text-base font-semibold text-slate-200">
            {agentLabel(detail.from)}
            <span className="text-slate-500 mx-2">→</span>
            {agentLabel(detail.to)}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {INCIDENTS.map(inc => (
              <div key={inc} className="rounded p-2 text-center"
                style={{ background: INCIDENT_COLOR[inc] + '12', border: `1px solid ${INCIDENT_COLOR[inc]}30` }}>
                <div className="text-lg font-bold" style={{ color: INCIDENT_COLOR[inc] }}>
                  {detail[`${inc}_count`]}
                </div>
                <div className="text-xs text-slate-500">{inc}</div>
              </div>
            ))}
            <div className="rounded p-2 text-center bg-[#0a1628] border border-slate-600/30">
              <div className={`text-lg font-bold ${detail.normal_count === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                {detail.normal_count}
              </div>
              <div className="text-xs text-slate-500">normal ops</div>
            </div>
          </div>

          <p className="text-xs text-slate-400 border-t border-slate-700 pt-3">
            {detail.normal_count === 0
              ? <span className="text-green-400 font-medium">Blocking this edge disrupts zero normal operations</span>
              : <span className="text-amber-400 font-medium">Blocking this edge would disrupt {detail.normal_count} normal delegation(s) </span>
            }
          </p>
        </div>
      )}

      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y}>{tooltip.children}</Tooltip>}
    </div>
  )
}
