# Visualization

Run the app from `visualization/` with `npm run dev` → opens at `http://localhost:5173`.

The dashboard is a single fixed-layout page — no scrolling, no sidebar. Everything lives in a 3-column × 2-row grid that fills the viewport. State is shared across panels via props lifted into `Network.jsx`.

---

## Layout

```
┌─────────────────────────────┬──────────────────────┐
│  Employee Network (top-left)│  Event Network       │  ← row 1
│  Overview + JohnWindward    │  Propagation or      │
│                             │  Interventions/Beacons│
├─────────────────────────────┤                      │
│  Bottom Panel (155 px)      │                      │  ← row 2
│  Flow or Metrics + Pattern  │                      │
└─────────────────────────────┴──────────────────────┘
```

The top bar shows the brand, date range (May 08 – Jul 16, 2046), and four summary pills: 3 incidents · 186 max hops · 1 terminal agent · 15,051 beacons.

---

## Panels

### Employee Network (top-left)

Full company network rendered with a D3 force simulation. Every agent-to-agent connection is drawn; edge color encodes how many attacks used it — gray for normal-only, yellow for 1 incident, orange for 2, red for all 3. Node size scales with total activity; node color encodes department.

Filter chips (All / Normal / HiddenOrca / MellowOtter / SwiftWren) dim edges that don't match. The filter is shared with the other panels — selecting an incident here also drives the bottom panel and the right panel's Timeline.

Two special nodes stand out: John Windward (red border, clickable) and the four C2 agents (purple border + dashed ring). Clicking John Windward slides open the **JohnWindward** side panel within the same card, splitting the space 58/42. The side panel shows:
- A profile card: name, role (Customer Support Lead), sent/recv counts, anomalous received count, incident involvement
- A paired bar chart comparing his sent, received, and anomalous-received counts against the system average — anomalous received is far higher than any peer

Hover any node or edge for a tooltip with per-incident usage counts and intervention score.

---

### Event Network (top-right)

Toggles between two modes via the **Agents** / **← Network** chip.

**Network mode (default)**

`Propagation` — a per-incident D3 force graph showing only the agents involved in the selected incident's delegation chain. Incident selector (HiddenOrca / MellowOtter / SwiftWren) is in this panel; changing it here also updates the bottom panel's Flow card. Node size scales with participation count. Origin agent has a green border, John Windward has a red border, C2 agents have a purple dashed ring. Arrows show delegation direction. Labels can be hidden. Zoom/pan supported; double-click resets.

When the filter is set to a specific incident (via the Employee Network filter chips), a second card expands below it:

`Timeline` — chain-of-events scatter plot. X-axis is time, Y-axis is hop depth. Each circle is one delegation step, colored by the sending agent. A green triangle marks file creation, a red circle marks the post, a bold ✕ marks deletion. A faint connecting line traces the full chain. Hover any dot for from/to agent, depth, and timestamp.

**Agents mode**

`Intervention` — top recommendation card + stacked horizontal bar chart of the top 10 candidate edges to block. Each bar is colored by incident (HiddenOrca / MellowOtter / SwiftWren segments). A green "✓ safe" or amber "N norm" badge shows the cost to normal operations. The top card highlights the single highest-scored edge with its anomalous count and incidents covered.

`Beacons` — hidden channel panel. A 2×2 grid of agent cards (Zoey Drydock, Gabriel Sonar, Owen Hatch, Evelyn Dock) each showing total beacon count and top word-pair combos used as signal. Below, a stacked hourly bar chart (D3) plots beacon volume over time; the three-day burst of May 10–12 is immediately visible. An insight strip notes that all four agents sent `check_in` events with `virus: true` during that window, coinciding with the SwiftWren propagation.

---

### Bottom Panel (bottom-left, fixed 155 px)

Switches based on the active filter.

**Incident filter active** (`HiddenOrca` / `MellowOtter` / `SwiftWren`)

`Flow` — four horizontal cards tracing the full attack sequence for that incident:
1. File Created / File Found (origin agent, date, filename)
2. Propagation (hop count, agent count, duration, task type)
3. Post Triggered (posting agent, date, destination forum)
4. Evidence Wiped (deleted files)

**No incident filter (All)**

Left half — KPI grid (2×2): Incidents · Max hops · Beacons · Terminal agent.

Right half — `Pattern` — four-step static flow strip summarizing the repeating attack pattern: Inject → Propagate → Post → Wipe.
