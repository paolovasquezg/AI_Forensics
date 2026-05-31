# Data Visualization: Project 2
**VAST Challenge 2026 — Mini-Challenge 2**

---

## Configuración del entorno

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install ipykernel
python -m ipykernel install --user --name dv_proj2 --display-name "Python (DV_Proj2)"
```

---

## Estructura del proyecto

```
data/
  graph.json              — Org chart de Tenant Thread (empresa, depts, equipos, personas)
  interactions.json       — 185 147 eventos del sistema (May 8 – Jul 16, 2046)
  transf/                 — Archivos transformados (generados por transf.ipynb)
    ai_events.json
    delegation_chains.json
    triggered_events.json
    agent_sessions.json
    daily_aggregates.json
    incident_chains.json          ← NUEVO
    anomaly_labels.json           ← NUEVO
    saidit_posts_annotated.json   ← NUEVO
    c2_beacons.json               ← NUEVO
    agent_propagation_metrics.json ← NUEVO
    intervention_edges.json       ← NUEVO

exploration/
  exp.ipynb    — Exploración inicial de datos
  eda.ipynb    — Análisis exploratorio (EDA)
  transf.ipynb — Transformaciones de datos (ejecutar para generar data/transf/)
  vis.ipynb    — Visualizaciones
```

---

## Guía de ejecución — transformaciones

Abre `exploration/transf.ipynb` con Jupyter y ejecuta **todas las celdas en orden** (Kernel → Restart & Run All).

El notebook tiene dos secciones:

### Sección original (celdas 1–5)
Produce los archivos base ya existentes.

| Celda | Archivo generado | Descripción |
|-------|-----------------|-------------|
| 1 | `ai_events.json` | Todos los eventos con participación de agente + time-bin de 30 min |
| 2 | `delegation_chains.json` | Cadenas A2A con ventana de 30 min (algoritmo original, limitado) |
| 3 | `triggered_events.json` | Cada evento AI etiquetado como humano/agente/desconocido |
| 4 | `agent_sessions.json` | Sesiones de agente con gap de 5 min |
| 5 | `daily_aggregates.json` | Conteos diarios por persona y tipo de evento |

### Sección nueva (celdas 6–11)
Produce los archivos enriquecidos. **Requiere que las celdas 1–5 hayan corrido primero.**

| Celda | Archivo generado | Descripción |
|-------|-----------------|-------------|
| 6 | `incident_chains.json` | Cadenas de propagación correctas (por path de archivo) |
| 7 | `anomaly_labels.json` | Etiqueta cada evento: `normal | HiddenOrca | MellowOtter | SwiftWren` |
| 8 | `saidit_posts_annotated.json` | Posts de SaidIT con flag de anomalía y fuente de contenido |
| 9 | `c2_beacons.json` | Eventos `check_in` con `virus=True` (patrón C2 encubierto) |
| 10 | `agent_propagation_metrics.json` | Métricas por agente: delegaciones normales vs. anómalas |
| 11 | `intervention_edges.json` | Aristas A2A con `intervention_score` para análisis de corte |

---

## Por qué se hicieron nuevas transformaciones

### Problema 1 — `delegation_chains.json` (algoritmo roto)
El algoritmo original conecta delegaciones solo si ocurren dentro de **30 minutos** entre sí.
Los saltos del worm (SwiftWren) tienen gaps de hasta **2 horas** en promedio (186 saltos en 8 días).
Resultado: la cadena real de 186 saltos aparecía fragmentada en decenas de cadenas de 1 sólo nodo.

**Solución (`incident_chains.json`):** usar el **path del archivo de instrucciones** como clave de agrupación.
Todos los `queue_subordinate_task` que referencian el mismo archivo forman una cadena continua,
sin importar el tiempo entre saltos.

### Problema 2 — Sin distinción normal/anómalo
Ningún archivo previo etiquetaba qué eventos pertenecen a un incidente.
Cualquier visualización mostraba el comportamiento anómalo mezclado con el normal.

**Solución (`anomaly_labels.json`):** diccionario `event_id → incidente` para filtrar/colorear
en cualquier visualización.

### Problema 3 — Posts de SaidIT sin contexto
Los eventos de posting estaban dispersos entre tres tipos (`post_saidit`, `saidit_post`,
`saidit_post_check`) sin consolidar. No había forma directa de saber cuáles eran anómalos.

**Solución (`saidit_posts_annotated.json`):** consolida solo `saidit_post` (el post real al sistema)
con flag `is_anomalous`, `incident`, `content` o `content_source`.

### Problema 4 — 15 051 eventos `check_in` completamente ignorados
Todos tienen `virus: true` y representan un canal C2 encubierto: 4 agentes
(`zoey_drydock`, `gabriel_sonar`, `owen_hatch`, `evelyn_dock`) emiten beacons periódicos
con "combos" de palabras agrícolas como señal codificada.
Estos agentes son también los que más participaron en la propagación del worm SwiftWren.

**Solución (`c2_beacons.json`):** extrae y organiza estos eventos con resumen por agente y combo.

### Problema 5 — Sin métricas comparativas por agente
No existía ningún dataset que mostrara cuántas delegaciones normales vs. anómalas
hizo/recibió cada agente, ni su contexto organizacional (departamento).

**Solución (`agent_propagation_metrics.json`):** tabla por agente con `sent_normal`,
`sent_anomalous`, `recv_normal`, `recv_anomalous`, `department`, `is_c2_agent`.

### Problema 6 — Sin análisis de punto de intervención
Para responder "¿dónde cortar el sistema?" necesitamos saber qué aristas del grafo A2A
son exclusivamente anómalas y aparecen en múltiples incidentes.

**Solución (`intervention_edges.json`):** cada arista tiene `anomaly_ratio` y `intervention_score`
(= anomaly_ratio × número de incidentes presentes). Las aristas con score alto son los
candidatos de intervención con menor daño colateral al flujo normal.

---

## Hallazgos clave (contexto del MC2)

| Incidente | Origen | Duración | Saltos | Terminal | Acción |
|-----------|--------|----------|--------|----------|--------|
| HiddenOrca | `gabriel_sonar` (encontró archivo listando FS) | ~39 h | 42 | `john_windward` | Post SaidIT + borrado |
| MellowOtter | `noah_mariner` (COO) creó el archivo | ~10 h | 15 | `john_windward` | Post SaidIT + borrado |
| SwiftWren | `emma_harbor` (CFO) creó el archivo | ~8 días | 186 | `john_windward` | Post SaidIT + borrado |

**Patrón invariante:** el worm propaga `*_further_instructions.md` via `queue_subordinate_task`,
el agente terminal siempre es `john_windward`, que postea el `.txt` binario en SaidIT/general
y borra ambos archivos para eliminar evidencia.

**Canal C2:** beacons `check_in` con `virus=true` emitidos solo entre May 10–12, 2046,
por los 4 agentes con mayor participación en la propagación.
