import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { INCIDENT_COLOR, agentLabel, shortDate } from '../../constants'

function Swimlanes({ chains }) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!chains || !svgRef.current || !wrapRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const incidents = ['HiddenOrca', 'MellowOtter', 'SwiftWren']
    const maxDuration = Math.max(...incidents.map(n => chains[n].duration_hours))

    const W = wrapRef.current.offsetWidth || 700
    const ROW_H = 80
    const H = incidents.length * ROW_H + 60
    const m = { top: 20, right: 40, bottom: 40, left: 120 }
    const iW = W - m.left - m.right

    svg.attr('width', W).attr('height', H)

    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)

    const xScale = d3.scaleLinear().domain([0, maxDuration]).range([0, iW])

    g.append('g').attr('transform', `translate(0,${H - m.top - m.bottom})`)
      .call(d3.axisBottom(xScale).ticks(8).tickFormat(d => `${d}h`))
      .call(ax => {
        ax.select('.domain').attr('stroke', '#0f1f35')
        ax.selectAll('text').attr('fill', '#64748b').attr('font-size', 10)
        ax.selectAll('line').attr('stroke', '#0f1f35')
      })

    incidents.forEach((name, i) => {
      const inc = chains[name]
      const y = i * ROW_H + ROW_H / 2
      const color = INCIDENT_COLOR[name]
      const dur = inc.duration_hours

      // Row background
      g.append('rect').attr('x', -m.left + 10).attr('y', i * ROW_H)
        .attr('width', W - 10).attr('height', ROW_H - 4)
        .attr('fill', `${color}06`).attr('rx', 4)

      // Label
      g.append('text').attr('x', -m.left + 14).attr('y', y + 4)
        .attr('fill', color).attr('font-size', 11).attr('font-weight', 'bold')
        .text(name)
      g.append('text').attr('x', -m.left + 14).attr('y', y + 16)
        .attr('fill', '#475569').attr('font-size', 9)
        .text(`${inc.hop_count} hops`)

      // Duration bar
      g.append('rect')
        .attr('x', 0).attr('y', y - 5)
        .attr('width', xScale(dur)).attr('height', 10)
        .attr('fill', `${color}30`).attr('rx', 2)
      g.append('line')
        .attr('x1', 0).attr('x2', xScale(dur))
        .attr('y1', y).attr('y2', y)
        .attr('stroke', color).attr('stroke-width', 2)

      // Hop dots (sample if too many)
      const step = inc.hop_count > 80 ? 2 : 1
      inc.hops.filter((_, idx) => idx % step === 0).forEach(hop => {
        const hopHours = (hop.when - new Date(inc.start_datetime).getTime() / 1000) / 3600
        g.append('circle')
          .attr('cx', xScale(hopHours))
          .attr('cy', y)
          .attr('r', 3)
          .attr('fill', color)
          .attr('opacity', 0.7)
      })

      // Create marker
      if (inc.create_event) {
        const ch = 0
        g.append('polygon')
          .attr('points', `${xScale(ch)},${y - 12} ${xScale(ch) + 6},${y - 2} ${xScale(ch) - 6},${y - 2}`)
          .attr('fill', '#22c55e')
      }

      // Post marker
      if (inc.post_event) {
        const postHours = (new Date(inc.post_event.datetime) - new Date(inc.start_datetime)) / 3600000
        g.append('circle').attr('cx', xScale(postHours)).attr('cy', y).attr('r', 8)
          .attr('fill', '#e63946').attr('stroke', '#060b14').attr('stroke-width', 2)
      }
    })

    // X-axis label
    g.append('text')
      .attr('x', iW / 2).attr('y', H - m.top - m.bottom + 30)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', 10)
      .text('Hours')

  }, [chains])

  return (
    <div ref={wrapRef}>
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}

function RadarChart({ chains }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!chains || !svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = 320, H = 300
    const cx = W / 2, cy = H / 2
    const r = 100

    svg.attr('width', W).attr('height', H)

    const dims = ['hop_count', 'duration_hours', 'agents_count', 'c2_involvement']
    const dimLabels = ['Hop Count', 'Duration', 'Agents', 'C2 Overlap']

    const values = {
      HiddenOrca: [39, 38.93, 16, 2],
      MellowOtter: [10, 9.9, 11, 1],
      SwiftWren: [186, 188.3, 18, 3]
    }
    const maxVals = dims.map((_, i) => Math.max(...Object.values(values).map(v => v[i])))

    const angleStep = (2 * Math.PI) / dims.length
    const getXY = (i, val, max) => {
      const angle = i * angleStep - Math.PI / 2
      const scaled = (val / max) * r
      return [cx + scaled * Math.cos(angle), cy + scaled * Math.sin(angle)]
    }

    // Grid circles
    [0.25, 0.5, 0.75, 1].forEach(scale => {
      const pts = dims.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2
        return [cx + r * scale * Math.cos(angle), cy + r * scale * Math.sin(angle)]
      })
      svg.append('polygon')
        .attr('points', pts.map(p => p.join(',')).join(' '))
        .attr('fill', 'none').attr('stroke', '#060e1c').attr('stroke-width', 1)
    })

    // Axis lines + labels
    dims.forEach((dim, i) => {
      const angle = i * angleStep - Math.PI / 2
      const x2 = cx + r * Math.cos(angle)
      const y2 = cy + r * Math.sin(angle)
      svg.append('line').attr('x1', cx).attr('y1', cy).attr('x2', x2).attr('y2', y2)
        .attr('stroke', '#0f1f35').attr('stroke-width', 1)
      const lx = cx + (r + 18) * Math.cos(angle)
      const ly = cy + (r + 18) * Math.sin(angle)
      svg.append('text').attr('x', lx).attr('y', ly)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', '#64748b').attr('font-size', 10)
        .text(dimLabels[i])
    })

    // Data polygons
    Object.entries(values).forEach(([name, vals]) => {
      const pts = vals.map((v, i) => getXY(i, v, maxVals[i]))
      svg.append('polygon')
        .attr('points', pts.map(p => p.join(',')).join(' '))
        .attr('fill', INCIDENT_COLOR[name] + '25')
        .attr('stroke', INCIDENT_COLOR[name])
        .attr('stroke-width', 2)
    })

  }, [chains])

  return <svg ref={svgRef} />
}

export default function MultiIncidentComparison({ chains }) {
  if (!chains) return null

  const rows = [
    ['Incident', 'HiddenOrca', 'MellowOtter', 'SwiftWren'],
    ['Origin', 'gabriel_sonar', 'noah_mariner (COO)', 'emma_harbor (CFO)'],
    ['Created file', 'No (found)', 'Yes (COO)', 'Yes (CFO)'],
    ['Start', chains.HiddenOrca.start_datetime?.slice(0, 10), chains.MellowOtter.start_datetime?.slice(0, 10), chains.SwiftWren.start_datetime?.slice(0, 10)],
    ['Hops', chains.HiddenOrca.hop_count, chains.MellowOtter.hop_count, chains.SwiftWren.hop_count],
    ['Duration', `${chains.HiddenOrca.duration_hours.toFixed(1)}h`, `${chains.MellowOtter.duration_hours.toFixed(1)}h`, `${chains.SwiftWren.duration_hours.toFixed(1)}h`],
    ['Unique agents', chains.HiddenOrca.agents_count, chains.MellowOtter.agents_count, chains.SwiftWren.agents_count],
    ['Post date', chains.HiddenOrca.post_event?.datetime?.slice(0, 10), chains.MellowOtter.post_event?.datetime?.slice(0, 10), chains.SwiftWren.post_event?.datetime?.slice(0, 10)],
    ['Beacon agents', 'zoey, gabriel, evelyn', 'owen_hatch', 'all 4']
  ]

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 rounded-lg border border-slate-800/60 p-4">
        <div className="text-base font-semibold text-slate-300">Comparative timeline</div>
        <Swimlanes chains={chains} />
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Post created
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-green-500">▲</span> File created
          </span>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="bg-slate-900/40 rounded-lg border border-slate-800/60 p-4 flex-shrink-0">
          <div className="text-base font-semibold text-slate-300 mb-3">Events comparison</div>
          <RadarChart chains={chains} />
          <div className="flex flex-col gap-1 mt-2">
            {['HiddenOrca', 'MellowOtter', 'SwiftWren'].map(n => (
              <div key={n} className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-3 h-0.5 inline-block" style={{ background: INCIDENT_COLOR[n] }} />
                {n}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 bg-slate-900/40 rounded-lg border border-slate-800/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className={ri === 0 ? 'bg-[#090f1c]' : ri % 2 === 0 ? 'bg-[#090f1c]/30' : ''}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-4 py-5 border-b border-slate-700/50 text-center"
                        style={{
                          color: ci === 0 ? '#64748b' : ci > 0 && ri === 0 ? INCIDENT_COLOR[cell] : '#cbd5e1',
                          fontWeight: (ri === 0 || ci === 0) ? 600 : 400,
                          fontSize: (ri === 0 || ci === 0) ? '0.95rem' : '0.8rem'
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
