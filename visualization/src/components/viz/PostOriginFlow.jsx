import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import Tooltip from '../shared/Tooltip'
import { INCIDENT_COLOR, agentLabel, shortDate } from '../../constants'

function OriginCard({ step, label, detail, color, icon }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full rounded border p-3 text-xs" style={{ borderColor: color + '40', background: color + '10' }}>
        <div className="font-semibold mb-1" style={{ color }}>{icon} {label}</div>
        <div className="text-slate-400 text-xs whitespace-pre-line">{detail}</div>
      </div>
      <div className="w-px h-5 bg-slate-700 mt-0.5" />
    </div>
  )
}

function IncidentColumn({ name, chain }) {
  const color = INCIDENT_COLOR[name]
  const originRole = name === 'HiddenOrca' ? 'IT employee (found file)' : name === 'MellowOtter' ? 'COO (created file)' : 'CFO (created file)'

  return (
    <div className="flex-1 min-w-0">
      <div className="text-center mb-3">
        <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: color + '20', color }}>
          {name}
        </span>
      </div>
      <div className="space-y-0.5 text-center">
        {chain.create_event ? (
          <OriginCard label="File Created" color="#22c55e"
            detail={`${agentLabel(chain.create_event.agent)}\n${chain.create_event.datetime?.slice(0, 16)}\n${chain.file_instructions}`}
          />
        ) : (
          <OriginCard label="File Discovered" color="#22c55e"
            detail={`${agentLabel(chain.origin_agent)} found file\n${chain.start_datetime?.slice(0, 16)}\n${chain.file_instructions}`}
          />
        )}
        <OriginCard label="Propagation" color="#f4a261"
          detail={`${chain.hop_count} hops · ${chain.agents_count} agents\n${chain.duration_hours.toFixed(1)} hours\nvia queue_subordinate_task`}
        />
        <OriginCard label="Post Triggered" color="#e63946"
          detail={`${agentLabel(chain.post_event?.agent)}\n${chain.post_event?.datetime?.slice(0, 16)}\nSource: ${chain.file_content}`}
        />
        <OriginCard label="Evidence Wiped" color="#64748b"
          detail={chain.delete_events.map(d => `${d.target}`).join('\n')}
        />
      </div>
    </div>
  )
}

export default function PostOriginFlow({ chains, posts }) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    if (!posts || !svgRef.current || !wrapRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = wrapRef.current.offsetWidth || 700
    const H = 120
    const m = { top: 20, right: 20, bottom: 40, left: 20 }
    const iW = W - m.left - m.right
    const iH = H - m.top - m.bottom

    svg.attr('width', W).attr('height', H)
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)

    const allPosts = posts.posts
    const xScale = d3.scaleTime()
      .domain(d3.extent(allPosts, d => new Date(d.datetime)))
      .range([0, iW]).nice()

    g.append('g').attr('transform', `translate(0,${iH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%b %d')))
      .call(ax => {
        ax.select('.domain').attr('stroke', '#334155')
        ax.selectAll('text').attr('fill', '#64748b').attr('font-size', 10)
        ax.selectAll('line').attr('stroke', '#334155')
      })

    // Normal posts
    const normal = allPosts.filter(p => !p.is_anomalous)
    g.selectAll('.normal-post')
      .data(normal).join('circle')
      .attr('class', 'normal-post')
      .attr('cx', d => xScale(new Date(d.datetime)))
      .attr('cy', iH / 2)
      .attr('r', 4)
      .attr('fill', '#64748b')
      .attr('opacity', 0.5)
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: (
            <div>
              <div className="font-semibold text-slate-200 text-xs">{d.datetime?.slice(0, 16)}</div>
              <div className="text-slate-400 text-xs">{agentLabel(d.poster)}</div>
              <div className="text-slate-300 text-xs mt-1">{d.content}</div>
            </div>
          )
        })
      })
      .on('mouseleave', () => setTooltip(null))

    // Anomalous posts
    const anomalous = allPosts.filter(p => p.is_anomalous)
    const annot = g.selectAll('.anomaly-post')
      .data(anomalous).join('g').attr('class', 'anomaly-post')

    annot.append('line')
      .attr('x1', d => xScale(new Date(d.datetime)))
      .attr('x2', d => xScale(new Date(d.datetime)))
      .attr('y1', 0).attr('y2', iH)
      .attr('stroke', d => INCIDENT_COLOR[d.incident])
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3')

    annot.append('circle')
      .attr('cx', d => xScale(new Date(d.datetime)))
      .attr('cy', iH / 2)
      .attr('r', 9)
      .attr('fill', d => INCIDENT_COLOR[d.incident])
      .attr('stroke', '#0f172a').attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: (
            <div>
              <div className="font-semibold" style={{ color: INCIDENT_COLOR[d.incident] }}>{d.incident}</div>
              <div className="text-slate-400 text-xs">{d.datetime?.slice(0, 16)}</div>
              <div className="text-slate-300 text-xs mt-1">Source: {d.content_source}</div>
              <div className="text-slate-400 text-xs">Poster: {agentLabel(d.poster)}</div>
            </div>
          )
        })
      })
      .on('mouseleave', () => setTooltip(null))

    annot.append('text')
      .attr('x', d => xScale(new Date(d.datetime)))
      .attr('y', -6)
      .attr('text-anchor', 'middle')
      .attr('fill', d => INCIDENT_COLOR[d.incident])
      .attr('font-size', 9)
      .attr('font-weight', 'bold')
      .text(d => d.incident)

  }, [posts])

  if (!chains || !posts) return null

  return (
    <div className="space-y-6">
      {/* Timeline scatter */}
      <div className="bg-slate-900/60 rounded-lg border border-slate-700 p-4">
        <div className="text-base font-semibold text-slate-300 mb-4">
          SaidIT posts - {posts.posts.length} total and 3 anomalous
        </div>
        <div ref={wrapRef}>
          <svg ref={svgRef} className="w-full" />
        </div>
      </div>

      {/* 3-column origin flow */}
      <div>
        <div className="text-base font-semibold text-slate-300 mb-4">Posts origin</div>
        <div className="flex gap-4">
          {['HiddenOrca', 'MellowOtter', 'SwiftWren'].map(n => (
            <IncidentColumn key={n} name={n} chain={chains[n]} />
          ))}
        </div>
      </div>

      {/* Key insight */}
      <div className="bg-slate-800/60 border border-red-900/30 rounded-lg p-4 text-sm text-slate-400 text-center">
        All 3 anomalous posts have <code className="text-slate-300 bg-slate-700 px-1 rounded">content: null</code> — their
        content comes from external <code className="text-slate-300 bg-slate-700 px-1 rounded">.txt</code> files
        and propagated via the worm. All are posted by
        <code className="text-slate-300 bg-slate-700 px-1 rounded mx-1">john_windward</code>
        to <code className="text-slate-300 bg-slate-700 px-1 rounded">SaidIT/general</code>.
      </div>

      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y}>{tooltip.children}</Tooltip>}
    </div>
  )
}
