import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import Tooltip from '../shared/Tooltip'
import { INCIDENT_COLOR, agentLabel } from '../../constants'

export default function JohnWindwardProfile({ agentMetrics, posts }) {
  const barRef = useRef(null)
  const timelineRef = useRef(null)
  const timelineWrapRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  const jw = agentMetrics?.agents?.find(a => a.agent_id === 'Agent/person:john_windward')
  const avgMetrics = agentMetrics?.agents?.reduce(
    (acc, a) => {
      acc.sent_normal += a.sent_normal
      acc.recv_normal += a.recv_normal
      acc.anomaly_recv += a.anomaly_recv_total
      acc.count += 1
      return acc
    },
    { sent_normal: 0, recv_normal: 0, anomaly_recv: 0, count: 0 }
  )

  useEffect(() => {
    if (!jw || !barRef.current || !avgMetrics) return
    const avg = avgMetrics.count > 0 ? avgMetrics : null
    if (!avg) return

    const metrics = [
      { label: 'Sent normal', jw: jw.sent_normal, avg: avg.sent_normal / avg.count },
      { label: 'Receive normal', jw: jw.recv_normal, avg: avg.recv_normal / avg.count },
      { label: 'Anomalous receive', jw: jw.anomaly_recv_total, avg: avg.anomaly_recv / avg.count }
    ]

    const svg = d3.select(barRef.current)
    svg.selectAll('*').remove()

    const W = 440, H = metrics.length * 80 + 60
    const m = { top: 20, right: 80, bottom: 30, left: 100 }
    const iW = W - m.left - m.right

    svg.attr('width', W).attr('height', H)
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)

    const maxVal = d3.max(metrics.flatMap(d => [d.jw, d.avg]))
    const xScale = d3.scaleLinear().domain([0, maxVal]).range([0, iW]).nice()
    const yScale = d3.scaleBand().domain(metrics.map(d => d.label)).range([0, H - m.top - m.bottom]).padding(0.35)

    g.append('g').attr('transform', `translate(0,${H - m.top - m.bottom})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .call(ax => {
        ax.select('.domain').attr('stroke', '#334155')
        ax.selectAll('text').attr('fill', '#64748b').attr('font-size', 10)
        ax.selectAll('line').attr('stroke', '#334155')
      })

    g.append('g').call(d3.axisLeft(yScale).tickSize(0))
      .call(ax => {
        ax.select('.domain').remove()
        ax.selectAll('text').attr('fill', '#94a3b8').attr('font-size', 10)
      })

    const barsG = g.selectAll('.metric').data(metrics).join('g').attr('class', 'metric')

    // Average bar (behind)
    barsG.append('rect')
      .attr('y', d => (yScale(d.label) || 0) + yScale.bandwidth() * 0.45)
      .attr('height', yScale.bandwidth() * 0.45)
      .attr('width', d => xScale(d.avg))
      .attr('fill', '#334155').attr('rx', 2)

    barsG.append('text')
      .attr('x', d => xScale(d.avg) + 4)
      .attr('y', d => (yScale(d.label) || 0) + yScale.bandwidth() * 0.7 + 3)
      .attr('fill', '#475569').attr('font-size', 9)
      .text(d => `avg ${d.avg.toFixed(1)}`)

    // JW bar (in front)
    barsG.append('rect')
      .attr('y', d => yScale(d.label) || 0)
      .attr('height', yScale.bandwidth() * 0.44)
      .attr('width', d => xScale(d.jw))
      .attr('fill', (_, i) => i === 2 ? '#e63946' : '#457b9d')
      .attr('rx', 2)

    barsG.append('text')
      .attr('x', d => xScale(d.jw) + 4)
      .attr('y', d => (yScale(d.label) || 0) + yScale.bandwidth() * 0.32)
      .attr('fill', '#cbd5e1').attr('font-size', 10).attr('font-weight', 'bold')
      .text(d => d.jw)

  }, [jw, avgMetrics])

  useEffect(() => {
    if (!posts || !timelineRef.current || !timelineWrapRef.current) return
    const svg = d3.select(timelineRef.current)
    svg.selectAll('*').remove()

    const allPosts = posts.posts
    const W = timelineWrapRef.current.offsetWidth || 500
    const H = 80
    const m = { top: 16, right: 20, bottom: 30, left: 20 }
    const iW = W - m.left - m.right

    svg.attr('width', W).attr('height', H)
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)

    const xScale = d3.scaleTime()
      .domain(d3.extent(allPosts, d => new Date(d.datetime)))
      .range([0, iW]).nice()

    g.append('g').attr('transform', `translate(0,${H - m.top - m.bottom})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%b %d')))
      .call(ax => {
        ax.select('.domain').attr('stroke', '#334155')
        ax.selectAll('text').attr('fill', '#64748b').attr('font-size', 10)
        ax.selectAll('line').attr('stroke', '#334155')
      })

    g.selectAll('.normal-post')
      .data(allPosts.filter(p => !p.is_anomalous))
      .join('circle')
      .attr('cx', d => xScale(new Date(d.datetime)))
      .attr('cy', H / 2 - m.top)
      .attr('r', 4).attr('fill', '#334155').attr('opacity', 0.6)
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: <div className="text-xs"><div>{agentLabel(d.poster)}</div><div>{d.datetime?.slice(0, 16)}</div></div>
        })
      })
      .on('mouseleave', () => setTooltip(null))

    const anomG = g.selectAll('.anom-post')
      .data(allPosts.filter(p => p.is_anomalous))
      .join('g')

    anomG.append('circle')
      .attr('cx', d => xScale(new Date(d.datetime)))
      .attr('cy', H / 2 - m.top)
      .attr('r', 8).attr('fill', d => INCIDENT_COLOR[d.incident])
      .attr('stroke', '#0f172a').attr('stroke-width', 2)
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: (
            <div className="text-xs">
              <div className="font-semibold" style={{ color: INCIDENT_COLOR[d.incident] }}>{d.incident}</div>
              <div>{d.datetime?.slice(0, 16)}</div>
              <div>Source: {d.content_source}</div>
            </div>
          )
        })
      })
      .on('mouseleave', () => setTooltip(null))

    anomG.append('text')
      .attr('x', d => xScale(new Date(d.datetime)))
      .attr('y', H / 2 - m.top - 14)
      .attr('text-anchor', 'middle')
      .attr('fill', d => INCIDENT_COLOR[d.incident])
      .attr('font-size', 9).attr('font-weight', 'bold')
      .text(d => d.incident)

  }, [posts])

  if (!jw) return <div className="text-slate-500 text-sm">Loading John Windward data...</div>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Profile card */}
        <div className="bg-slate-800 border border-red-900/40 rounded-lg p-6 max-w-150 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-900/40 border-2 border-red-500 flex items-center justify-center text-lg">
              👤
            </div>
            <div>
              <div className="font-bold text-slate-200">John Windward</div>
              <div className="text-xs text-slate-400">Customer Support Lead</div>
            </div>
          </div>
          {[
            ['Department', 'Customer Support', '#e76f51'],
            ['Normal sent', jw.sent_normal, '#64748b'],
            ['Normal receive', jw.recv_normal, '#64748b'],
            ['Anomalous receive', jw.anomaly_recv_total, '#e63946'],
            ['Incidents', jw.incidents_involved?.join(', '), '#f4a261'],
            ['Beacon agent', jw.is_c2_agent ? 'No' : 'No', '#64748b']
          ].map(([k, v, color]) => (
            <div key={k} className="flex justify-between text-xs py-1 border-b border-slate-700/40">
              <span className="text-slate-500">{k}</span>
              <span className="font-semibold text-right max-w-[300px]" style={{ color }}>{String(v)}</span>
            </div>
          ))}
          <div className="mt-3 p-2 bg-red-950/30 border border-red-900/30 rounded text-xs text-red-300">
            Terminal agent in all 3 incidents — the worm always ends here
          </div>
        </div>

        {/* Bar comparison */}
        <div className="bg-slate-900/60 rounded-lg border border-slate-700 p-4 flex-shrink-0">
          <div className="text-sm font-semibold text-slate-300 mb-2">Activity vs System average</div>
          <svg ref={barRef} />
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-blue-600 inline-block rounded" />John Windward</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-slate-600 inline-block rounded" />System average</span>
          </div>
        </div>
      </div>
    </div>
  )
}
