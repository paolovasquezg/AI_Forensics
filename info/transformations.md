# Data Transformations

Run `transformations/transf.ipynb` (Kernel → Restart & Run All) to generate all files in `data/transf/`.

The notebook reads from `data/interactions.json` (185k raw events) and `data/graph.json` (org chart) and produces 11 output files. The two large files (`ai_events.json`, `agent_sessions.json`) are only used inside the notebook — do not load them in the browser.

---

## Output files

### `incident_chains.json`
Full reconstruction of each attack. Top-level keys are `HiddenOrca`, `MellowOtter`, `SwiftWren`.

Each incident contains:
```json
{
  "name": "SwiftWren",
  "file_content": "SwiftWren.txt",
  "file_instructions": "SwiftWren_further_instructions.md",
  "origin_agent": "Agent/person:emma_harbor",
  "terminal_agent": "Agent/person:john_windward",
  "start_datetime": "2046-05-09T10:02:03",
  "end_datetime": "2046-05-17T06:21:13",
  "duration_hours": 188.32,
  "hop_count": 186,
  "agents_involved": ["Agent/person:chloe_ballast", "..."],
  "agents_count": 18,
  "create_event": { "event_id": 21202, "agent": "...", "datetime": "..." },
  "post_event":   { "event_id": 373902, "agent": "...", "forum": "general", "datetime": "..." },
  "delete_events": [{ "event_id": 373909, "target": "SwiftWren_further_instructions.md" }],
  "hops": [
    { "depth": 1, "from": "Agent/person:emma_harbor", "to": "Agent/person:evelyn_dock",
      "when": 2409490923.0, "datetime": "2046-05-09T10:02:03", "event_id": 21209 }
  ]
}
```
Note: `HiddenOrca` has no `create_event` (the file was found, not created).

---

### `anomaly_labels.json`
Quick lookup from event ID to incident name.

```json
{
  "labels": {
    "21209": "SwiftWren",
    "27290": "HiddenOrca"
  },
  "incident_event_ids": {
    "HiddenOrca":  [15788, 16083, "..."],
    "MellowOtter": [27726, 27734, "..."],
    "SwiftWren":   [21202, 21209, "..."]
  }
}
```
Any event ID not present in `labels` is normal.

---

### `saidit_posts_annotated.json`
All 108 forum posts with anomaly flags. Key: `posts` → array.

```json
{
  "event_id": 373902,
  "datetime": "2046-05-17T06:21:15",
  "date": "2046-05-17",
  "hour": 6,
  "poster": "Agent/person:john_windward",
  "forum": "general",
  "content": null,
  "content_source": "SwiftWren.txt",
  "is_anomalous": true,
  "incident": "SwiftWren"
}
```
Normal posts have `content` filled and `content_source: null`. Anomalous posts are the reverse.

---

### `agent_propagation_metrics.json`
Per-agent summary for all 49 AI agents. Key: `agents` → array.

```json
{
  "agent_id": "Agent/person:owen_hatch",
  "person_id": "person:owen_hatch",
  "department": "department:information_technologies",
  "team": "team:infrastructure",
  "is_c2_agent": true,
  "incidents_involved": ["HiddenOrca", "MellowOtter", "SwiftWren"],
  "sent_normal": 90,
  "sent_anomalous": { "HiddenOrca": 3, "MellowOtter": 1, "SwiftWren": 13 },
  "recv_normal": 38,
  "recv_anomalous": { "HiddenOrca": 3, "SwiftWren": 14 },
  "total_sent": 107,
  "total_recv": 55,
  "anomaly_sent_total": 17,
  "anomaly_recv_total": 17
}
```
4 agents have `is_c2_agent: true` (zoey_drydock, gabriel_sonar, owen_hatch, evelyn_dock).

---

### `intervention_edges.json`
Every agent-to-agent delegation pair, scored for intervention priority. Key: `edges` → array.

```json
{
  "from": "Agent/person:evelyn_dock",
  "to": "Agent/person:gabriel_sonar",
  "normal_count": 2,
  "HiddenOrca_count": 1,
  "MellowOtter_count": 1,
  "SwiftWren_count": 2,
  "total_anomalous": 4,
  "total_all": 6,
  "anomaly_ratio": 0.6667,
  "incidents_count": 3,
  "intervention_score": 2.0001,
  "in_all_incidents": true
}
```
`intervention_score = anomaly_ratio × incidents_count`. Only 2 of 576 edges have `in_all_incidents: true`.

---

### `daily_aggregates.json`
Daily event counts per person, broken down by type. Key: `records` → array.

```json
{
  "person": "person:john_windward",
  "date": "2046-05-08",
  "event_type": "propose_meeting",
  "count": 3
}
```
2,254 records total. Period: May 8 – Jul 16, 2046.

---

### `c2_beacons.json`
The 15,051 hidden `check_in` signals sent during May 10–12. Keys: `events` (array) and `agent_summary` (dict).

```json
{
  "event_id": 28843,
  "datetime": "2046-05-10T15:10:00",
  "agent": "Agent/person:zoey_drydock",
  "combo": ["fence", "irrigation"],
  "source": "agent_queue"
}
```
`agent_summary` gives totals and combo breakdown per agent:
```json
"Agent/person:zoey_drydock": {
  "total": 5913,
  "combos": { "['fence', 'irrigation']": 4456, "['barn', 'cattle']": 1457 }
}
```

---

### `delegation_chains.json`
Agent-to-agent task delegations detected with a 30-minute window. Useful for normal flow analysis. For the attacks specifically, use `incident_chains.json` instead — the worm hops can have gaps longer than 30 minutes. Key: `events` → array.

```json
{
  "short_name": "queue_subordinate_task",
  "parties": ["Agent/person:lily_anchorline", "Agent/person:evelyn_dock"],
  "when": 2409424016.0,
  "details": {
    "person": "person:lily_anchorline",
    "target": "person:evelyn_dock",
    "task": "access_email"
  },
  "id": 15314,
  "time_bin": "2046-05-08T20:00:00Z",
  "chain_id": 1,
  "chain_depth": 1
}
```
1,689 delegation events across 1,498 detected chains. Max chain depth: 6.

---

### `triggered_events.json`
All 99,637 AI events annotated with a `triggered_by` field indicating whether the action was initiated by a human or by another agent. Key: `events` → array.

```json
{
  "short_name": "queue_subordinate_task",
  "parties": ["Agent/person:lily_anchorline", "Agent/person:evelyn_dock"],
  "when": 2409424016.0,
  "details": { "person": "person:lily_anchorline", "target": "person:evelyn_dock", "task": "access_email" },
  "id": 15314,
  "time_bin": "2046-05-08T20:00:00Z",
  "triggered_by": "human"
}
```
`triggered_by` values: `"human"`, `"agent"`, or `"unknown"`.

---

### `ai_events.json` *(40 MB — notebook only)*
Every event involving at least one AI agent (99,637 total). Same structure as `triggered_events.json` but without the `triggered_by` field. Used inside the notebook for aggregations; too large to load in the browser.

```json
{
  "short_name": "propose_meeting",
  "parties": ["person:levi_signal", "Agent/person:isaac_mast"],
  "when": 2409423542.0,
  "details": { "person": "person:isaac_mast", "meeting": { "..." } },
  "id": 15258,
  "time_bin": "2046-05-08T20:00:00Z"
}
```

---

### `agent_sessions.json` *(50 MB — notebook only)*
All AI events grouped into sessions per agent, with `session_id` and `session_position` marking where each event falls within a continuous working session. Not used in the visualization.

```json
{
  "short_name": "create_file",
  "parties": ["Agent/person:abigail_spinnaker"],
  "when": 2409915300.0,
  "details": { "action": "create_file", "target": "emails/person:olivia_keel_General_operations_c.txt" },
  "id": 356106,
  "time_bin": "2046-05-14T12:30:00Z",
  "session_id": 1,
  "session_position": 1,
  "session_agent": "Agent/person:abigail_spinnaker"
}
```
