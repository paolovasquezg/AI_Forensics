import { useState, useEffect, useRef } from 'react'
import useData from './hooks/useData'
import { SECTIONS } from './constants'
import Sidebar from './components/Sidebar'
import SectionWrapper from './components/Wrapper'
import ExecutiveSummary from './components/Summary'
import IncidentTimeline from './components/viz/Timeline'
import PropagationNetwork from './components/viz/Propagation'
import SystemOverview from './components/viz/Overview'
import PostOriginFlow from './components/viz/PostOriginFlow'
import MultiIncidentComparison from './components/viz/Comparison'
import InterventionRecommender from './components/viz/Intervention'
import DailyHeatmap from './components/viz/Heatmap'
import JohnWindwardProfile from './components/viz/JohnWindward'
import C2Beacons from './components/viz/Beacons'

export default function App() {
  const data = useData()
  const [selectedIncident, setSelectedIncident] = useState('SwiftWren')
  const [activeSection, setActiveSection] = useState('executive-summary')
  const mainRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { root: null, threshold: 0.2, rootMargin: '-80px 0px -60% 0px' }
    )
    SECTIONS.forEach(sec => {
      const el = document.getElementById(sec.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [data.loading])

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-slate-400 text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center space-y-2 max-w-sm">
          <div className="text-red-400 text-lg font-semibold">Error</div>
          <div className="text-slate-400 text-sm">{data.error}</div>
          <div className="text-slate-500 text-xs mt-4">
            Make sure you have the required data
          </div>
        </div>
      </div>
    )
  }

  const chains = data.chains
  const posts = data.posts ? { posts: data.posts.posts } : null

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar
        activeSection={activeSection}
        selectedIncident={selectedIncident}
        onIncidentChange={setSelectedIncident}
      />

      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <SectionWrapper
          id="executive-summary"
          title="Overview"
          subtitle="Three posts were published on the internal forum by an AI agent without any human writing them"
        >
          <ExecutiveSummary chains={chains} posts={data.posts} />
        </SectionWrapper>

        <SectionWrapper
          id="section-1-post"
          title="How was the post made?"
          subtitle="Malicious file travelled through dozens of AI agents, each one unknowingly passing it along, until it reached the agent that posts to the forum"
        >
          <div className="space-y-8">
            <div>
              <h3 className="text-base font-semibold text-slate-300 mb-4">Chain of events</h3>
              <IncidentTimeline
                chains={chains}
                selectedIncident={selectedIncident}
                onIncidentChange={setSelectedIncident}
              />
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-300 mb-4">Event network</h3>
              <PropagationNetwork
                chains={chains}
                agentMetrics={data.agentMetrics}
                selectedIncident={selectedIncident}
                onIncidentChange={setSelectedIncident}
              />
            </div>
          </div>
        </SectionWrapper>

        <SectionWrapper
          id="section-2-system"
          title="Attack network"
          subtitle="Small cluster of connections is where all three attacks traveled through"
        >
          <SystemOverview
            interventionEdges={data.interventionEdges}
            agentMetrics={data.agentMetrics}
          />
        </SectionWrapper>

        <SectionWrapper
          id="section-3-meaning"
          title="What did the posts say?"
          subtitle="Posts contents came from files that were secretly carried through the chain and posted. They were then immediately deleted"
        >
          <PostOriginFlow
            chains={chains}
            posts={data.posts}
          />
        </SectionWrapper>

        <SectionWrapper
          id="section-4-incidents"
          title="Event happened three times"
          subtitle="The same pattern played out three separate times, each starting from a different person"
        >
          <MultiIncidentComparison chains={chains} />
        </SectionWrapper>

        <SectionWrapper
          id="section-5-intervene"
          title="Stop it from happening again"
          subtitle="By blocking one specific connection between two agents all three attacks could have been stopped"
        >
          <InterventionRecommender interventionEdges={data.interventionEdges} />
        </SectionWrapper>

        <SectionWrapper
          id="section-6-baseline"
          title="Normal activity across the company"
          subtitle="Daily activity for every employee over the full period"
        >
          <DailyHeatmap
            dailyAggregates={data.dailyAggregates}
            agentMetrics={data.agentMetrics}
          />
        </SectionWrapper>

        <SectionWrapper
          id="section-7-john"
          title="Why always the same agent?"
          subtitle="Every attack ended with the same AI agent making the forum post"
        >
          <JohnWindwardProfile
            agentMetrics={data.agentMetrics}
            posts={data.posts}
          />
        </SectionWrapper>

        <SectionWrapper
          id="section-8-c2"
          title="A hidden communication channel"
          subtitle="While the attacks were spreading, four agents were quietly sending thousands of hidden signals to each other, which stopped the moment the attacks ended"
        >
          <C2Beacons c2Beacons={data.c2Beacons} />
        </SectionWrapper>

        <div className="h-16" />
      </main>
    </div>
  )
}
