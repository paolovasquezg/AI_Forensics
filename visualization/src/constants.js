import * as d3 from 'd3'

export const INCIDENT_NAMES = ['HiddenOrca', 'MellowOtter', 'SwiftWren']

export const INCIDENT_COLOR = {
  normal:      '#64748b',
  HiddenOrca:  '#f4a261',
  MellowOtter: '#457b9d',
  SwiftWren:   '#e63946'
}

export const DEPT_IDS = [
  'department:executive_suite',
  'department:products',
  'department:human_resources',
  'department:legal',
  'department:information_technologies',
  'department:customer_support'
]

export const DEPT_LABELS = {
  'department:executive_suite':       'Executive Suite',
  'department:products':              'Products',
  'department:human_resources':       'HR',
  'department:legal':                 'Legal',
  'department:information_technologies': 'IT',
  'department:customer_support':      'Customer Support'
}

export const DEPT_COLOR = d3.scaleOrdinal()
  .domain(DEPT_IDS)
  .range(['#6a0dad', '#2a9d8f', '#e9c46a', '#f4a261', '#264653', '#e76f51'])

export const C2_AGENTS = [
  'Agent/person:zoey_drydock',
  'Agent/person:gabriel_sonar',
  'Agent/person:owen_hatch',
  'Agent/person:evelyn_dock'
]

export const JOHN_WINDWARD = 'Agent/person:john_windward'

export const agentLabel = (id) =>
  (id || '')
    .replace('Agent/person:', '')
    .replace('person:', '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

export const deptLabel = (id) => DEPT_LABELS[id] || (id || '').replace('department:', '')

export const shortDate = (dt) => {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

export const SECTIONS = [
  { id: 'executive-summary',  label: 'Overview' },
  { id: 'section-1-post',     label: 'How was the post made?' },
  { id: 'section-2-system',   label: 'The full picture' },
  { id: 'section-3-meaning',  label: 'What did the posts say?' },
  { id: 'section-4-incidents',label: 'This happened three times' },
  { id: 'section-5-intervene',label: 'How to stop it' },
  { id: 'section-6-baseline', label: 'Normal activity' },
  { id: 'section-7-john',     label: 'Why always the same agent?' },
  { id: 'section-8-c2',       label: 'A hidden channel' }
]

export const COMBO_COLORS = d3.scaleOrdinal()
  .domain(["fence,irrigation","barn,cattle","crop,irrigation","manure,wheat","crop,harvest"])
  .range(["#38bdf8","#34d399","#fb923c","#f472b6","#a78bfa"])

export function buildPersonDeptLookup(graphData) {
  if (!graphData) return {}
  const personTeam = {}
  const teamDept = {}
  for (const edge of graphData.edges) {
    if (edge.source.startsWith('team:') && edge.target.startsWith('person:') && edge.relation === 'contains')
      personTeam[edge.target] = edge.source
    if (edge.source.startsWith('department:') && edge.target.startsWith('team:'))
      teamDept[edge.target] = edge.source
  }
  const lookup = {}
  for (const [person, team] of Object.entries(personTeam))
    lookup[person] = teamDept[team] || 'unknown'
  return lookup
}
