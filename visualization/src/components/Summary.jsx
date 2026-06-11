import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { INCIDENT_COLOR, agentLabel, shortDate } from '../constants'

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
      <div className="text-3xl font-bold mb-1" style={{ color }}>{value}</div>
      <div className="text-sm font-semibold text-slate-200">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function MiniTimeline({ chains }) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!chains || !svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = wrapRef.current?.offsetWidth || 700
    const H = 180
    const m = { top: 20, right: 20, bottom: 40, left: 70 }
    const innerW = W - m.left - m.right
    const innerH = H - m.top - m.bottom

    svg.attr('width', W).attr('height', H)

    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)

    const incidents = ['HiddenOrca', 'MellowOtter', 'SwiftWren']
    const allDates = incidents.flatMap(n => [
      new Date(chains[n].start_datetime),
      new Date(chains[n].end_datetime)
    ])
    const xScale = d3.scaleTime().domain(d3.extent(allDates)).range([0, innerW])
    const yScale = d3.scaleBand().domain(incidents).range([0, innerH]).padding(0.4)

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%b %d')))
      .call(ax => ax.select('.domain').attr('stroke', '#334155'))
      .call(ax => ax.selectAll('text').attr('fill', '#64748b').attr('font-size', 11))
      .call(ax => ax.selectAll('line').attr('stroke', '#334155'))

    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('text').attr('fill', '#94a3b8').attr('font-size', 11))

    incidents.forEach(name => {
      const inc = chains[name]
      const x1 = xScale(new Date(inc.start_datetime))
      const x2 = xScale(new Date(inc.end_datetime))
      const y = yScale(name) + yScale.bandwidth() / 2

      g.append('rect')
        .attr('x', x1).attr('y', y - yScale.bandwidth() / 2)
        .attr('width', x2 - x1).attr('height', yScale.bandwidth())
        .attr('rx', 3)
        .attr('fill', INCIDENT_COLOR[name])
        .attr('opacity', 0.3)

      g.append('line')
        .attr('x1', x1).attr('x2', x2)
        .attr('y1', y).attr('y2', y)
        .attr('stroke', INCIDENT_COLOR[name])
        .attr('stroke-width', 2)

      if (inc.post_event) {
        const px = xScale(new Date(inc.post_event.datetime))
        g.append('circle').attr('cx', px).attr('cy', y).attr('r', 6)
          .attr('fill', INCIDENT_COLOR[name])
          .attr('stroke', '#0f172a').attr('stroke-width', 2)
      }
    })
  }, [chains])

  return (
    <div ref={wrapRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}

export default function ExecutiveSummary({ chains, posts }) {
  if (!chains || !posts) return null

  const anomalousPosts = posts.posts.filter(p => p.is_anomalous)
  const c2Count = 15051

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Anomalous Posts" value="3" sub="All by john_windward" color="#e63946" />
        <StatCard label="Incidents" value="3" sub="HiddenOrca · MellowOtter · SwiftWren" color="#f4a261" />
        <StatCard label="Max Chain Length" value="186" sub="SwiftWren — 8 days" color="#457b9d" />
        <StatCard label="Beacons" value="15,051" sub="May 10–12 · 4 agents" color="#8b30cbff" />
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <div className="text-md font-semibold text-slate-300 mb-3">Timeline</div>
        <MiniTimeline chains={chains} />
        <div className="flex gap-6 mt-3">
          {['HiddenOrca', 'MellowOtter', 'SwiftWren'].map(n => (
            <div key={n} className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-3 h-3 rounded-full" style={{ background: INCIDENT_COLOR[n] }} />
              <span>{n}</span>
              <span className="text-slate-500">— {chains[n].hop_count} hops · {chains[n].duration_hours.toFixed(1)}h</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-5">
        <div className="text-md font-semibold text-slate-300 mb-3">Pattern</div>
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-2 items-center text-xs text-slate-400">
          {[
            { label: 'Injected file', desc: '*_further_instructions.md', color: '#f4a261' },
            { arrow: true },
            { label: 'Propagation', desc: 'queue_subordinate_task chain', color: '#64748b' },
            { arrow: true },
            { label: 'Terminal agent', desc: 'john_windward posts to SaidIT', color: '#e63946' },
            { arrow: true },
            { label: 'Evidence wiped', desc: 'Both files deleted', color: '#475569' }
          ].map((step, i) => step.arrow
            ? <span key={i} className="text-slate-600 text-lg text-center">→</span>
            : (
              <div key={i} className="flex flex-col justify-center items-center bg-slate-900/60 rounded px-3 py-4 border border-slate-700/50 h-full">
                <span className="font-semibold text-base" style={{ color: step.color }}>{step.label}</span>
                <span className="text-slate-500 mt-0.5 text-sm">{step.desc}</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
