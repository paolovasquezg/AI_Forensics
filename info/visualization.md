# Visualization

Run the app from `visualization/` with `npm run dev` → opens at `http://localhost:5173`.

The sidebar has two controls: an incident selector (HiddenOrca / MellowOtter / SwiftWren) that updates the relevant charts across sections, and a table of contents for jumping between sections.

---

## Sections

### Overview
Key numbers at a glance: 3 attacks, max chain of 186 hops, 15k hidden signals. A compact horizontal timeline shows when each attack started, ended, and when the forum post was made. Each incident is a colored bar; the filled circle marks the moment of posting.

---

### How was the post made?

**Chain of events over time**
Each dot is one forwarding step (hop) in the chain. X-axis is time, Y-axis is how deep into the chain it has traveled. A green triangle marks when the file was created, a red circle marks the post, and an X marks deletion. Dots are colored by the agent that sent that step. A stats panel on the right shows duration, hop count, and agents involved for the selected incident.

**Who passed it to whom**
A network graph where each circle is an AI agent and lines show who delegated to whom. Circle size reflects how many times that agent participated. The green-bordered circle is where the chain started; the red-bordered one is always John Windward. Purple-ringed circles are the four agents also involved in the hidden channel.

---

### The full picture
The full company network — every agent-to-agent connection that exists in the data. Gray edges are normal work. Orange edges appeared in one or two attacks; red edges appeared in all three. Use the filter buttons to isolate one attack at a time and see exactly which connections it used.

---

### What did the posts say?

**Post timeline**
All 108 forum posts plotted over time. The 3 anomalous ones are larger, colored by attack, and labeled. Hovering any dot shows its content or source file.

**Origin flow (three columns)**
For each attack, a vertical sequence of cards traces the full journey: file created or found → chain propagation → post made → files deleted. Makes clear that the post content came from a file, not from anyone writing it.

---

### This happened three times

**Parallel timeline**
All three attacks on the same relative time axis (hours from start). Each row is one attack. Dots show individual hops; the red circle is the post. SwiftWren's row is dramatically longer than the other two.

**Comparison chart**
A spider/radar chart comparing hop count, duration, number of agents, and C2 overlap across the three attacks — normalized so they can be placed on the same axes.

**Summary table**
Side-by-side table with origin agent, their role, start date, number of hops, duration, unique agents, and whether the file was created or found.

---

### How to stop it

**Top recommendation card**
The single best connection to block, with the incidents it covers, how many times it was used in attacks, and confirmation that blocking it affects zero normal work.

**Ranked candidate chart**
Top 10 candidate connections as horizontal stacked bars. Each bar's color segments show which incidents that connection was part of. A green or amber badge on the right shows the cost in normal operations. Click any row to see the full breakdown below.

---

### Normal activity
A heatmap of daily event counts for every employee across the full 70-day period. Darker cells mean more activity. John Windward's row is highlighted with a dashed border — his activity is near-zero except during the attacks. Vertical red lines mark the three post dates.

---

### Why always the same agent?

**Activity comparison**
Horizontal bar chart comparing John Windward's sent/received counts against the system average. His anomalous receive count is by far the highest — he is the end point for every attack chain.

**Post timeline**
All 108 forum posts again, but this time the focus is on identifying which ones came from John Windward. His three posts (one per attack) are shown in their incident color with labels.

**Profile card**
His department, role, and a summary of his involvement: present in all three attacks, always as the last agent before the post is made.

---

### A hidden channel

**Agent cards**
One card per agent showing their name, total beacon count, and the word-pair combo they used as their signal signature.

**Hourly beacon chart**
A stacked bar chart showing beacon volume per hour, colored by agent. The three-day burst during May 10–12 is immediately visible, as is the complete stop afterwards. Hovering a bar shows the exact count per agent for that hour.
