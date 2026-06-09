import { useEffect, useState } from 'react'

const FILES = [
  ['chains',            '/data/transf/incident_chains.json'],
  ['anomalyLabels',     '/data/transf/anomaly_labels.json'],
  ['posts',             '/data/transf/saidit_posts_annotated.json'],
  ['c2Beacons',         '/data/transf/c2_beacons.json'],
  ['agentMetrics',      '/data/transf/agent_propagation_metrics.json'],
  ['interventionEdges', '/data/transf/intervention_edges.json'],
  ['dailyAggregates',   '/data/transf/daily_aggregates.json'],
  ['graph',             '/data/graph.json']
]

export default function useData() {
  const [state, setState] = useState({ loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const results = await Promise.all(
          FILES.map(([, url]) => fetch(url).then(r => {
            if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`)
            return r.json()
          }))
        )
        if (cancelled) return
        const data = {}
        FILES.forEach(([key], i) => { data[key] = results[i] })
        setState({ loading: false, error: null, ...data })
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err.message })
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return state
}
