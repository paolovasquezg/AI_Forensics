# Data Visualization: Project 2
**VAST Challenge 2026 — Mini-Challenge 2**

---

## Environment setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Project structure

```
data/
  graph.json              
  interactions.json       
  transf/                 
    ai_events.json
    delegation_chains.json
    triggered_events.json
    agent_sessions.json
    daily_aggregates.json
    incident_chains.json
    anomaly_labels.json
    saidit_posts_annotated.json
    c2_beacons.json
    agent_propagation_metrics.json
    intervention_edges.json

exploration/              
  exp.ipynb              
  eda.ipynb               
  vis.ipynb               

transformations/         
  transf.ipynb            

visualization/            
  src/
    App.jsx              
    main.jsx              
    index.css             
    constants.js          
    hooks/useData.js      
    views/
      Bottom.jsx          
      Employee.jsx        
      Event.jsx           
      Network.jsx         
    components/
      Beacons.jsx         
      Flow.jsx            
      Intervention.jsx    
      JohnWindward.jsx    
      Overview.jsx        
      Pattern.jsx         
      Propagation.jsx     
      Timeline.jsx        
      Tooltip.jsx         
  vite.config.js          

info/
  transformations.md      
  visualization.md 
```

---

## Visualization

![Dashboard](images/Dashboard.png)

---

---

## Workflow

### 1. Explore
Open the notebooks in `exploration/` to understand the raw data before running any transformations. No files are written.

| Notebook | Purpose |
|----------|---------|
| `exp.ipynb` | Org chart and general interaction network |
| `eda.ipynb` | AI vs. human activity breakdown, delegation patterns, temporal trends |
| `vis.ipynb` | Interactive charts reading from `data/transf/` |

### 2. Transform
Open `transformations/transf.ipynb` and run all cells in order (**Kernel → Restart & Run All**).

Produces 11 files in `data/transf/`. See `info/transformations.md` for a description of each file and its schema.

### 3. Visualize

```bash
cd visualization
npm install
npm run dev        # opens at http://localhost:5173
```
