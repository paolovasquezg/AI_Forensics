import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import Tooltip from '../shared/Tooltip'
import { agentLabel } from '../../constants'

const POST_DATES = ['2046-05-10', '2046-05-10', '2046-05-17']

export default function DailyHeatmap({ dailyAggregates, agentMetrics }) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [eventFilter, setEventFilter] = useState('all')

  const eventTypes = useMemo(() => {
    if (!dailyAggregates) return []
    const types = new Set(dailyAggregates.records.map(r => r.event_type))
    return ['all', ...types].slice(0, 8)
  }, [dailyAggregates])

  const metricsMap = useMemo(() => {
    const m = {}
    agentMetrics?.agents?.forEach(a => { m[a.person_id] = a })
    return m
  }, [agentMetrics])

  useEffect(() => {
    if (!dailyAggregates || !svgRef.current || !wrapRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const records = dailyAggregates.records.filter(r =>
      eventFilter === 'all' || r.event_type === eventFilter
    )

    // Aggregate by person+date
    const pivot = {}
    records.forEach(r => {
      const key = `${r.person}|||${r.date}`
      pivot[key] = (pivot[key] || 0) + r.count
    })

    const allPersons = [...new Set(records.map(r => r.person))].sort((a, b) => {
      const deptA = metricsMap[a]?.department || 'z'
      const deptB = metricsMap[b]?.department || 'z'
      if (deptA !== deptB) return deptA.localeCompare(deptB)
      return a.localeCompare(b)
    })
    const allDates = [...new Set(records.map(r => r.date))].sort()

    if (!allPersons.length || !allDates.length) return

    const CELL_W = Math.max(4, Math.min(10, Math.floor((wrapRef.current.offsetWidth - 180) / allDates.length)))
    const CELL_H = 12
    const m = { top: 40, right: 20, bottom: 30, left: 160 }
    const W = m.left + allDates.length * CELL_W + m.right
    const H = m.top + allPersons.length * CELL_H + m.bottom

    svg.attr('width', W).attr('height', H)
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)

    const maxCount = d3.max(Object.values(pivot)) || 1
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxCount])

    const xScale = d3.scaleBand().domain(allDates).range([0, allDates.length * CELL_W]).padding(0.05)
    const yScale = d3.scaleBand().domain(allPersons).range([0, allPersons.length * CELL_H]).padding(0.05)

    // Date ticks (monthly)
    const monthDates = allDates.filter(d => d.endsWith('-08') || d.endsWith('-01'))
    g.selectAll('.date-tick')
      .data(monthDates)
      .join('text')
      .attr('class', 'date-tick')
      .attr('x', d => (xScale(d) || 0) + xScale.bandwidth() / 2)
      .attr('y', -6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', 9)
      .text(d => d.slice(5))

    // Person labels
    g.selectAll('.person-label')
      .data(allPersons)
      .join('text')
      .attr('class', 'person-label')
      .attr('x', -8)
      .attr('y', d => (yScale(d) || 0) + yScale.bandwidth() / 2 + 3)
      .attr('text-anchor', 'end')
      .attr('font-size', 9)
      .attr('fill', d => d === 'person:john_windward' ? '#e63946' : '#475569')
      .attr('font-weight', d => d === 'person:john_windward' ? 'bold' : 'normal')
      .text(d => agentLabel(d))

    // Heat cells
    const cellData = []
    allPersons.forEach(person => {
      allDates.forEach(date => {
        const count = pivot[`${person}|||${date}`] || 0
        if (count > 0) cellData.push({ person, date, count })
      })
    })

    g.selectAll('.cell')
      .data(cellData)
      .join('rect')
      .attr('class', 'heat-cell')
      .attr('x', d => xScale(d.date) || 0)
      .attr('y', d => yScale(d.person) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.count))
      .attr('rx', 1)
      .on('mousemove', (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          children: (
            <div>
              <div className="font-semibold text-slate-200">{agentLabel(d.person)}</div>
              <div className="text-slate-400 text-xs">{d.date}</div>
              <div className="text-slate-300 text-xs mt-1">Events: {d.count}</div>
            </div>
          )
        })
      })
      .on('mouseleave', () => setTooltip(null))

    // John Windward highlight border
    const jwY = yScale('person:john_windward')
    if (jwY !== undefined) {
      g.append('rect')
        .attr('x', -4).attr('y', jwY - 2)
        .attr('width', allDates.length * CELL_W + 8)
        .attr('height', yScale.bandwidth() + 4)
        .attr('fill', 'none')
        .attr('stroke', '#e63946')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .attr('rx', 2)
    }

    // Vertical markers for anomalous post dates
    const uniquePostDates = [...new Set(POST_DATES)]
    uniquePostDates.forEach(pd => {
      const px = xScale(pd)
      if (px !== undefined) {
        g.append('line')
          .attr('x1', px + xScale.bandwidth() / 2)
          .attr('x2', px + xScale.bandwidth() / 2)
          .attr('y1', -12).attr('y2', allPersons.length * CELL_H)
          .attr('stroke', '#e63946').attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,3').attr('opacity', 0.6)
        g.append('text')
          .attr('x', px + xScale.bandwidth() / 2)
          .attr('y', -16)
          .attr('text-anchor', 'middle')
          .attr('fill', '#e63946').attr('font-size', 8)
          .text('POST')
      }
    })

  }, [dailyAggregates, agentMetrics, eventFilter])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-xs text-slate-400">Event type:</div>
        {eventTypes.map(t => (
          <button
            key={t}
            onClick={() => setEventFilter(t)}
            className="px-2.5 py-1 rounded text-xs border transition-all"
            style={{
              background: eventFilter === t ? '#334155' : 'transparent',
              borderColor: eventFilter === t ? '#64748b' : '#1e293b',
              color: eventFilter === t ? '#f1f5f9' : '#64748b'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div ref={wrapRef} className="bg-slate-900/60 rounded-lg border border-slate-700 p-4 overflow-auto max-h-[600px]">
        <svg ref={svgRef} />
      </div>

      <div className="flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 border border-red-500 border-dashed" />
          john_windward row
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-red-400">│</span>
          Anomalous post dates
        </span>
      </div>

      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y}>{tooltip.children}</Tooltip>}
    </div>
  )
}
