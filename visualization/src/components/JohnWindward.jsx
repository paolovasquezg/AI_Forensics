import { useEffect, useRef, useCallback, useState } from 'react'
import * as d3 from 'd3'
import Tooltip from './Tooltip'

export default function JohnWindward({ agentMetrics }) {
  const svgRef = useRef(null)
  const chartWrap = useRef(null)
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

  const drawChart = useCallback(() => {
    if (!jw || !svgRef.current || !chartWrap.current || !avgMetrics?.count) return
    const avg = avgMetrics

    const W = chartWrap.current.offsetWidth || 360
    const H = chartWrap.current.offsetHeight || 200
    if (!W || !H) return

    const metrics = [
      { label: 'Normal sent', jw: jw.sent_normal, avg: avg.sent_normal / avg.count },
      { label: 'Normal received', jw: jw.recv_normal, avg: avg.recv_normal / avg.count },
      { label: 'Anomalous received', jw: jw.anomaly_recv_total, avg: avg.anomaly_recv / avg.count },
    ]

    const m = { top: 12, right: 56, bottom: 32, left: 112 }
    const iW = W - m.left - m.right
    const iH = H - m.top - m.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', W).attr('height', H)

    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)

    const maxVal = d3.max(metrics.flatMap(d => [d.jw, d.avg])) || 1
    const xScale = d3.scaleLinear().domain([0, maxVal]).range([0, iW]).nice()
    const yScale = d3.scaleBand().domain(metrics.map(d => d.label))
      .range([0, iH]).padding(0.35)

    g.append('g').selectAll('line')
      .data(xScale.ticks(4))
      .join('line')
      .attr('x1', d => xScale(d)).attr('x2', d => xScale(d))
      .attr('y1', 0).attr('y2', iH)
      .attr('stroke', '#efeae0').attr('stroke-width', 1)

    g.append('g').attr('transform', `translate(0,${iH})`)
      .call(d3.axisBottom(xScale).ticks(4))
      .call(ax => {
        ax.select('.domain').attr('stroke', '#e7e1d6')
        ax.selectAll('text').attr('fill', '#a69e91').attr('font-size', 9)
        ax.selectAll('line').attr('stroke', '#e7e1d6')
      })

    g.append('g').call(d3.axisLeft(yScale).tickSize(0))
      .call(ax => {
        ax.select('.domain').remove()
        ax.selectAll('text').attr('fill', '#7d766b').attr('font-size', 9)
      })

    const row = g.selectAll('.row').data(metrics).join('g').attr('class', 'row')

    row.append('rect')
      .attr('y', d => (yScale(d.label) || 0) + yScale.bandwidth() * 0.46)
      .attr('height', yScale.bandwidth() * 0.44)
      .attr('width', d => xScale(d.avg))
      .attr('fill', '#e8e1d4').attr('rx', 2)

    row.append('text')
      .attr('x', d => xScale(d.avg) + 5)
      .attr('y', d => (yScale(d.label) || 0) + yScale.bandwidth() * 0.72 + 3)
      .attr('fill', '#a69e91').attr('font-size', 8)
      .text(d => `avg ${d.avg.toFixed(1)}`)

    row.append('rect')
      .attr('y', d => yScale(d.label) || 0)
      .attr('height', yScale.bandwidth() * 0.44)
      .attr('width', d => xScale(d.jw))
      .attr('fill', (_, i) => i === 2 ? '#e63946' : '#457b9d')
      .attr('rx', 2)

    row.append('text')
      .attr('x', d => xScale(d.jw) + 5)
      .attr('y', d => (yScale(d.label) || 0) + yScale.bandwidth() * 0.31)
      .attr('fill', '#4d4842').attr('font-size', 9).attr('font-weight', 'bold')
      .text(d => d.jw)

    row
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: (
            <div>
              <div style={{ fontWeight: 600, fontSize: 11, color: '#2b2823', marginBottom: 4 }}>{d.label}</div>
              <div style={{ fontSize: 10, color: '#457b9d' }}>John Windward: <b style={{ color: '#2b2823' }}>{d.jw}</b></div>
              <div style={{ fontSize: 10, color: '#7d766b' }}>System avg: {d.avg.toFixed(1)}</div>
            </div>
          )
        })
      })
      .on('mouseleave', () => setTooltip(null))
  }, [jw, avgMetrics])

  useEffect(() => {
    const t = setTimeout(drawChart, 30)
    return () => clearTimeout(t)
  }, [drawChart])

  useEffect(() => {
    if (!chartWrap.current) return
    const ro = new ResizeObserver(() => drawChart())
    ro.observe(chartWrap.current)
    return () => ro.disconnect()
  }, [drawChart])

  if (!jw) return <div style={{ color: '#7d766b', fontSize: 12 }}>Loading…</div>

  const stats = [
    { key: 'Dept', val: 'Customer Support', color: '#e76f51' },
    { key: 'Sent', val: jw.sent_normal, color: '#4d4842' },
    { key: 'Recv', val: jw.recv_normal, color: '#4d4842' },
    { key: 'Anom. recv', val: jw.anomaly_recv_total, color: '#e63946' },
    { key: 'Incidents', val: jw.incidents_involved?.join(', '), color: '#c77d3a' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 10, overflow: 'hidden' }}>

      <div style={{
        flexShrink: 0,
        background: 'linear-gradient(135deg, #fdfbf7 0%, #efeae0 100%)',
        border: '1px solid rgba(230,57,70,0.20)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        <div style={{ height: 3, background: 'linear-gradient(to right, #e63946, #9b1320 60%, transparent)' }} />

        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: 'radial-gradient(circle at 35% 35%, rgba(230,57,70,0.25), rgba(230,57,70,0.06))',
              border: '2px solid rgba(230,57,70,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              boxShadow: '0 0 18px rgba(230,57,70,0.15)',
            }}>👤</div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#2b2823', letterSpacing: '-0.01em' }}>John Windward</div>
              <div style={{ fontSize: 10, color: '#7d766b', marginTop: 1 }}>Customer Support Lead</div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px',
              background: 'rgba(230,57,70,0.10)',
              border: '1px solid rgba(230,57,70,0.25)',
              borderRadius: 99,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e63946', boxShadow: '0 0 6px #e63946', flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 600, color: '#c1342f', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                TERMINAL AGENT
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {stats.map(({ key, val, color }) => (
              <div key={key} style={{
                background: '#f8f4ec',
                border: '1px solid #e7e1d6',
                borderRadius: 6, padding: '5px 10px',
                display: 'flex', flexDirection: 'column', gap: 2,
                minWidth: 72,
              }}>
                <div style={{ fontSize: 8, color: '#a69e91', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '.07em' }}>{key}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(val)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, minHeight: 0,
        background: '#fdfbf7',
        border: '1px solid #e7e1d6',
        borderRadius: 10, padding: '12px 12px 10px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#a69e91', textTransform: 'uppercase', letterSpacing: '.09em', fontFamily: 'JetBrains Mono, monospace' }}>
            Activity vs System Average
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ color: '#457b9d', label: 'John Windward' }, { color: '#e8e1d4', label: 'Sys. avg' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#a69e91', fontFamily: 'JetBrains Mono, monospace' }}>
                <span style={{ display: 'inline-block', width: 12, height: 6, borderRadius: 2, background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        <div ref={chartWrap} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <svg ref={svgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        </div>
      </div>

      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y}>{tooltip.children}</Tooltip>}
    </div>
  )
}
