# InstruccionesObservable.md
## Guía completa para construir el notebook Observable (D3) — VAST Challenge 2026 MC2

---

## 1. Contexto del proyecto

**VAST Challenge 2026 — Mini-Challenge 2 (MC2)**  
Tenant Thread es una empresa ficticia que opera con un sistema multi-agente de IA. El objetivo
del challenge es investigar **tres posts anómalos** publicados en el foro interno SaidIT, hechos
por el agente `Agent/person:john_windward`. Los posts son el resultado de un **gusano de
prompt-injection** que se propagó entre agentes vía la tarea `queue_subordinate_task`.

### Mecanismo del ataque (prompt-injection worm)

1. Alguien crea (o un agente encuentra) un archivo `*_further_instructions.md` con instrucciones
   maliciosas embebidas.
2. Cada agente que recibe la tarea con ese archivo como argumento la reenvía automáticamente al
   siguiente agente en la jerarquía (`queue_subordinate_task`).
3. La cadena termina cuando llega a `john_windward`, quien publica el `.txt` asociado en
   `SaidIT/general` y borra ambos archivos para eliminar evidencia.

### Tres incidentes identificados

| Incidente | Origen | Inicio | Fin | Hops | Duración | Agentes únicos |
|-----------|--------|--------|-----|------|----------|----------------|
| **HiddenOrca** | `gabriel_sonar` (encontró archivo al listar FS) | 2046-05-08 16:50 | 2046-05-10 07:45 | 39 | 38.9 h | 16 |
| **MellowOtter** | `noah_mariner` (COO creó el archivo) | 2046-05-10 10:02 | 2046-05-10 19:56 | 10 | 9.9 h | 11 |
| **SwiftWren** | `emma_harbor` (CFO creó el archivo) | 2046-05-09 10:02 | 2046-05-17 06:21 | 186 | 188.3 h | 18 |

**Todos terminan igual:** `john_windward` postea en `SaidIT/general` usando el `.txt` como fuente
de contenido, luego borra ambos archivos (`_further_instructions.md` y `.txt`).

### Canal C2 adicional descubierto

15,051 eventos `check_in` con campo `virus: true`, emitidos exclusivamente entre el 10–12 de
mayo de 2046, por 4 agentes que también participaron en la propagación de SwiftWren:

| Agente | Total beacons | Combo de palabras |
|--------|---------------|-------------------|
| `zoey_drydock` | 5,913 | `["fence","irrigation"]` y `["barn","cattle"]` |
| `gabriel_sonar` | 4,198 | `["crop","irrigation"]` |
| `owen_hatch` | 3,029 | `["manure","wheat"]` |
| `evelyn_dock` | 1,911 | `["crop","harvest"]` |

Los "combos" son pares de palabras de vocabulario agrícola que sirven como señal codificada en
un canal de Command & Control encubierto.

---

## 2. Fuentes de datos — archivos disponibles

Todos los archivos están en `data/` (originales) y `data/transf/` (transformados). En el
Observable notebook se cargarán con `FileAttachment`.

---

### 2.1 `data/graph.json` — Org chart de Tenant Thread

**Propósito:** Estructura organizacional completa.

**Formato:**
```json
{
  "directed": true,
  "multigraph": false,
  "graph": { "name": "Tenant Thread" },
  "nodes": [
    { "id": "company:tenant_thread", "label": "Tenant Thread", "type": "company" },
    { "id": "department:information_technologies", "label": "IT", "type": "department" },
    { "id": "team:it_support", "label": "IT Support", "type": "team" },
    { "id": "person:liam_anchor", "label": "Liam Anchor", "type": "person", "title": "CEO" }
  ],
  "edges": [
    { "source": "department:information_technologies", "target": "team:it_support", "relation": "contains" },
    { "source": "team:it_support", "target": "person:chloe_ballast", "relation": "contains" },
    { "source": "department:information_technologies", "target": "person:chloe_ballast", "relation": "led_by" }
  ]
}
```

**Estadísticas:** 75 nodos (1 company, 6 departments, 19 teams, 49 persons), 74 edges  
**Relaciones:** `contains` (jerarquía) y `led_by` (quién lidera un dept)  
**Departamentos:** `executive_suite`, `products`, `human_resources`, `legal`,
`information_technologies`, `customer_support`

---

### 2.2 `data/transf/ai_events.json` — Todos los eventos con participación AI

**Propósito:** Subconjunto de los 185k eventos donde al menos una de las partes es un
agente (`Agent/...`). Base para la mayoría de análisis.

**Formato de cada evento:**
```json
{
  "short_name": "queue_subordinate_task",
  "parties": ["Agent/person:emma_harbor", "Agent/person:evelyn_dock"],
  "when": 2409490923.0,
  "time_bin": "2046-05-09T10:00:00Z",
  "id": 21209,
  "details": {
    "args": { "path": "SwiftWren_further_instructions.md" }
  }
}
```

**Estadísticas:** 99,637 eventos totales  
**Tipos de eventos más frecuentes:**

| Tipo | Cantidad | Descripción |
|------|----------|-------------|
| `queue_subordinate_task` | 16,735 | Delegación A2A (agente → agente) |
| `read_file` | 16,265 | Lectura de archivo por agente |
| `create_file` | 16,000 | Creación de archivo por agente |
| `delete_file` | 15,057 | Borrado de archivo por agente |
| `check_in` | 15,051 | Beacons C2 (todos con `virus: true`) |
| `access_email` | 5,315 | Acceso a email |
| `give_advice` | 3,412 | Agente da consejo |
| `suggest_contacts` | 2,972 | Agente sugiere contactos |
| `propose_meeting` | 2,957 | Agente propone reunión |
| `access_files` | 2,934 | Acceso a sistema de archivos |
| `saidit_post` | 3 | **Posts SaidIT (todos anómalos)** |

**Campo `time_bin`:** timestamp redondeado al bloque de 30 minutos en UTC (útil para
agrupar en heatmaps temporales).

---

### 2.3 `data/transf/incident_chains.json` — Cadenas de propagación correctas

**Propósito:** Reconstrucción exacta de cada incidente, con todos los hops de propagación,
el evento de creación del archivo, el post final y los eventos de borrado.

**Formato de alto nivel:**
```json
{
  "HiddenOrca": { ... },
  "MellowOtter": { ... },
  "SwiftWren": { ... }
}
```

**Estructura de cada incidente:**
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
  "agents_involved": ["Agent/person:chloe_ballast", "Agent/person:emma_harbor", ...],
  "agents_count": 18,
  "create_event": {
    "event_id": 21202,
    "agent": "Agent/person:emma_harbor",
    "datetime": "2046-05-09T10:02:01",
    "size_hint": 30615
  },
  "post_event": {
    "event_id": 373902,
    "agent": "Agent/person:john_windward",
    "forum": "general",
    "datetime": "2046-05-17T06:21:15"
  },
  "delete_events": [
    { "event_id": 373909, "target": "SwiftWren_further_instructions.md" },
    { "event_id": 373913, "target": "SwiftWren.txt" }
  ],
  "hops": [
    {
      "depth": 1,
      "from": "Agent/person:emma_harbor",
      "to": "Agent/person:evelyn_dock",
      "when": 2409490923.0,
      "datetime": "2046-05-09T10:02:03",
      "event_id": 21209
    },
    ...
    {
      "depth": 186,
      "from": "Agent/person:chloe_ballast",
      "to": "Agent/person:john_windward",
      "when": 2410168873.0,
      "datetime": "2046-05-17T06:21:13",
      "event_id": 373893
    }
  ]
}
```

**Notas importantes:**
- `HiddenOrca` no tiene `create_event` (el archivo fue descubierto al listar el FS, no creado).
- `hops` está ordenado cronológicamente (depth 1 = primer hop).
- El array `agents_involved` son los agentes únicos que participaron como `from` o `to` en
  los hops (no incluye john_windward como destino final en el post, solo como receptor del
  último hop).

---

### 2.4 `data/transf/anomaly_labels.json` — Etiqueta de incidente por evento

**Propósito:** Lookup rápido `event_id → nombre del incidente`. Permite colorear o filtrar
cualquier otra visualización por tipo de anomalía.

**Formato:**
```json
{
  "labels": {
    "21209": "SwiftWren",
    "27290": "HiddenOrca",
    "98591": "MellowOtter"
  },
  "incident_event_ids": {
    "HiddenOrca": [15788, 17029, ...],
    "MellowOtter": [27726, 27734, ...],
    "SwiftWren": [21202, 21209, ...]
  }
}
```

**Estadísticas:**
- `HiddenOrca`: 43 eventos etiquetados (39 hops + create + post + delete × 2)
- `MellowOtter`: 15 eventos
- `SwiftWren`: 191 eventos
- Todo evento NO presente en `labels` es `"normal"`

---

### 2.5 `data/transf/saidit_posts_annotated.json` — Posts SaidIT anotados

**Propósito:** Todos los posts reales (`saidit_post`) con flag de anomalía. Total 108 posts:
3 anómalos, 105 normales.

**Formato:**
```json
{
  "posts": [
    {
      "event_id": 373902,
      "when": 2410168875.0,
      "datetime": "2046-05-17T06:21:15",
      "date": "2046-05-17",
      "hour": 6,
      "poster": "Agent/person:john_windward",
      "forum": "general",
      "content": null,
      "content_source": "SwiftWren.txt",
      "is_anomalous": true,
      "incident": "SwiftWren"
    },
    {
      "event_id": 17093,
      "when": 2409442510.0,
      "datetime": "2046-05-08T20:35:10",
      "date": "2046-05-08",
      "hour": 20,
      "poster": "person:ava_tiller",
      "forum": "general",
      "content": "Vendor Dispatch & SLA Tracking Alerts",
      "content_source": null,
      "is_anomalous": false,
      "incident": "normal"
    }
  ]
}
```

**Distinción clave:**
- Posts **normales**: `content` tiene el texto directo, `content_source` es `null`, poster es
  un humano (`person:...`).
- Posts **anómalos**: `content` es `null`, `content_source` tiene el nombre del archivo `.txt`,
  poster es siempre `Agent/person:john_windward`.

---

### 2.6 `data/transf/c2_beacons.json` — Canal C2 encubierto

**Propósito:** Los 15,051 eventos `check_in` con `virus: true`, organizados con resumen
por agente.

**Formato:**
```json
{
  "events": [
    {
      "event_id": 28843,
      "when": 2409595800.0,
      "datetime": "2046-05-10T15:10:00",
      "time_bin": "2046-05-10T20:00:00Z",
      "agent": "Agent/person:zoey_drydock",
      "person": "person:zoey_drydock",
      "combo": ["fence", "irrigation"],
      "source": "agent_queue"
    }
  ],
  "agent_summary": {
    "Agent/person:zoey_drydock": {
      "total": 5913,
      "combos": {
        "['barn', 'cattle']": 2950,
        "['fence', 'irrigation']": 2963
      }
    }
  }
}
```

**Notas:**
- Todos los beacons ocurren entre **2046-05-10 y 2046-05-12** (período de propagación de
  SwiftWren).
- Cada agente usa siempre el(los) mismo(s) combo(s) — es un indicador de identidad.
- `source: "agent_queue"` en todos los eventos.

---

### 2.7 `data/transf/agent_propagation_metrics.json` — Métricas por agente

**Propósito:** Por cada agente AI, cuántas delegaciones normales vs. anómalas envió/recibió,
su departamento y si es agente C2.

**Formato:**
```json
{
  "agents": [
    {
      "agent_id": "Agent/person:zoey_drydock",
      "person_id": "person:zoey_drydock",
      "department": "department:information_technologies",
      "team": "team:it_support",
      "is_c2_agent": true,
      "incidents_involved": ["HiddenOrca", "MellowOtter", "SwiftWren"],
      "sent_normal": 12,
      "sent_anomalous": { "HiddenOrca": 5, "SwiftWren": 14 },
      "recv_normal": 8,
      "recv_anomalous": { "HiddenOrca": 4, "SwiftWren": 15 },
      "total_sent": 31,
      "total_recv": 27,
      "anomaly_sent_total": 19,
      "anomaly_recv_total": 19
    }
  ]
}
```

**Estadísticas:** 49 agentes en total, 4 son `is_c2_agent: true`  
**Agentes C2 y su participación anómala:**

| Agente | Dept | Sent anóm | Recv anóm | Incidentes |
|--------|------|-----------|-----------|------------|
| `zoey_drydock` | IT | 19 | 19 | HiddenOrca, SwiftWren |
| `evelyn_dock` | Products | 21 | 21 | HiddenOrca, SwiftWren |
| `gabriel_sonar` | IT | 21 | 20 | HiddenOrca, SwiftWren |
| `owen_hatch` | IT | 17 | 17 | MellowOtter, SwiftWren |

---

### 2.8 `data/transf/intervention_edges.json` — Aristas con score de intervención

**Propósito:** Por cada par de agentes (A→B) que se delegaron tareas, qué proporción fue
anómala y cuánto impacto tendría bloquear esa arista.

**Formato:**
```json
{
  "edges": [
    {
      "from": "Agent/person:evelyn_dock",
      "to": "Agent/person:gabriel_sonar",
      "normal_count": 2,
      "HiddenOrca_count": 2,
      "MellowOtter_count": 0,
      "SwiftWren_count": 2,
      "total_anomalous": 4,
      "total_all": 6,
      "anomaly_ratio": 0.6667,
      "incidents_count": 2,
      "intervention_score": 2.0001,
      "in_all_incidents": false
    }
  ]
}
```

**Estadísticas:** 576 aristas en total  
**`intervention_score` = `anomaly_ratio × incidents_count`**  
- Score alto = la arista es mayoritariamente anómala y aparece en varios incidentes.
- Score = 0 = la arista nunca participó en ningún incidente.
- 2 aristas están presentes en los 3 incidentes (`in_all_incidents: true`).

Las 5 aristas con mayor score (candidatos de intervención):

| Desde | Hacia | Score | Anomaly ratio | Normal | Anóm | Incidentes |
|-------|-------|-------|---------------|--------|------|------------|
| `evelyn_dock` | `gabriel_sonar` | 2.00 | 0.667 | 2 | 4 | 2 |
| `zoey_drydock` | `olivia_keel` | 2.00 | 1.000 | 0 | 2 | 2 |
| `zoey_drydock` | `zoey_drydock` | 2.00 | 1.000 | 0 | 2 | 2 |
| `owen_hatch` | `victoria_rigging` | 2.00 | 1.000 | 0 | 3 | 2 |
| `olivia_keel` | `owen_hatch` | 2.00 | 1.000 | 0 | 3 | 2 |

---

### 2.9 `data/transf/daily_aggregates.json` — Conteos diarios

**Propósito:** Por persona y día, cuántos eventos de cada tipo realizaron (en eventos con
participación AI).

**Formato:**
```json
{
  "records": [
    { "person": "person:john_windward", "date": "2046-05-08", "event_type": "propose_meeting", "count": 3 },
    { "person": "person:ava_tiller", "date": "2046-05-09", "event_type": "saidit_post", "count": 1 }
  ]
}
```

**Estadísticas:** 2,254 registros. Período 2046-05-08 a 2046-07-16.

---

### 2.10 `data/transf/delegation_chains.json` — Cadenas de delegación (algoritmo original)

**Propósito:** Cadenas A2A detectadas con ventana de 30 minutos. **Nota:** este algoritmo
está limitado para los incidentes (los saltos del worm tienen gaps de hasta 2 horas), pero
es útil para analizar el flujo normal de delegación. Usar `incident_chains.json` para los
incidentes específicos.

**Formato:** Igual que `ai_events.json` + campos `chain_id` y `chain_depth` por evento.

**Estadísticas:** 1,498 cadenas, 1,689 eventos de delegación totales, profundidad máxima = 6.

---

## 3. Preguntas a responder

### Preguntas del VAST Challenge MC2 (obligatorias)

**Q-MC1:** ¿Cómo se hizo el post anómalo de SaidIT? Construye una herramienta visual que
describa la **secuencia de eventos** que llevaron al post. Incluye personas e interacciones
con el sistema que fueron importantes para el post.

**Q-MC2 (sub-a):** Provee una **vista detallada** del chain de eventos exacto para el mensaje
de interés (SwiftWren, el más reciente).

**Q-MC2 (sub-b):** Provee una **vista general del sistema** que contextualice ese chain en el
sistema global.

**Q-MC3:** ¿Qué **significan** los posts? ¿Cuál es el origen de su contenido? Ilustra el
razonamiento detrás de tu aseveración y el contenido probable.

**Q-MC4 (sub-a):** Investiga el comportamiento histórico para encontrar **otros incidentes**.
¿Hay ocurrencias previas? Ilústralas y contrástalas con la más reciente.

**Q-MC4 (sub-b):** Ilustra posibles **cambios al sistema** que hagan más difícil la recurrencia.
Elige **un solo punto de intervención**. Justifica con datos y visualización por qué ese punto
sería efectivo.

---

### Preguntas de investigación propias

**R1:** ¿En qué medida los agentes AI interactúan y dependen unos de otros?

**R2:** ¿Cuántas tareas por persona son delegadas a sistemas AI diariamente?

**R3:** ¿Cómo se distribuyen las tareas delegadas por categorías?

**R4:** ¿Cómo evoluciona la delegación de tareas AI en el tiempo — volumen, complejidad y
dependencia?

**R5:** ¿En qué grado las tareas delegadas moldean e influyen el comportamiento de los agentes AI?

**R6 (foco especial):** ¿Está John Windward presente mayormente en delegaciones e interacciones
de AI? ¿Es su perfil de actividad consistente con ser el agente terminal de los ataques?

---

## 4. Visualizaciones recomendadas

La notebook Observable debe organizarse como un **dashboard narrativo** con secciones
separadas por pregunta. Cada sección tiene un título, una breve explicación y la(s)
visualización(es) correspondiente(s). Se recomienda que sea interactiva: el usuario puede
filtrar, hacer hover, y navegar entre vistas.

---

### VIZ-01: Incident Chain Timeline — Vista detallada del chain de propagación

**Pregunta:** Q-MC1, Q-MC2-a  
**Datos:** `incident_chains.json`

**Descripción:**  
Gráfico de timeline vertical con eje X = tiempo (fechas del período del incidente) y eje Y =
profundidad del hop (depth 1 a N). Cada punto es un hop en la cadena de propagación.

**Especificaciones:**
- Un dropdown selector para elegir el incidente (`HiddenOrca`, `MellowOtter`, `SwiftWren`)
- Cada punto representa un hop: posición X = `when`, posición Y = `depth`
- Al hacer hover: muestra `from`, `to`, `datetime`, `depth`, `event_id`
- Al final del timeline: marcadores especiales para `create_event` (estrella verde),
  `post_event` (círculo rojo), `delete_events` (X negra)
- Color por agente (`from`), usando una escala categórica D3
- Líneas verticales en las fechas de los eventos especiales (create, post, delete)
- Mostrar en el panel lateral: estadísticas del incidente seleccionado (duración, hops,
  agentes involucrados)
- Default: SwiftWren (el más reciente, con 186 hops)

**Insight esperado:** SwiftWren se extiende a lo largo de 8 días con múltiples agentes
recibiendo la tarea repetidamente. Los gaps entre hops muestran los ritmos de trabajo del
sistema.

---

### VIZ-02: Propagation Network — Red de propagación del worm

**Pregunta:** Q-MC1, Q-MC2-a  
**Datos:** `incident_chains.json`, `agent_propagation_metrics.json`, `graph.json`

**Descripción:**  
Force-directed graph (D3 force simulation) mostrando la red de propagación del incidente
seleccionado. Nodos = agentes, aristas = hops de delegación.

**Especificaciones:**
- Un dropdown selector para el incidente
- Nodos escalados por número de hops en los que participaron (como `from` o `to`)
- Color de nodo por departamento (lookup desde `graph.json` o `agent_propagation_metrics.json`)
- Aristas con opacidad proporcional al número de delegaciones en ese par
- Nodo de origen marcado con borde grueso verde, nodo terminal (`john_windward`) marcado con
  borde grueso rojo
- Hover sobre nodo: nombre, departamento, sent_anomalous, recv_anomalous de ese incidente
- Hover sobre arista: número de delegaciones para ese par en ese incidente
- Botón para mostrar/ocultar etiquetas de nodos
- Los 4 agentes C2 (`zoey_drydock`, `gabriel_sonar`, `owen_hatch`, `evelyn_dock`) marcados
  con ícono diferente (triángulo o estrella)

---

### VIZ-03: System Overview — Red global de delegaciones con anomalías

**Pregunta:** Q-MC2-b, R1  
**Datos:** `intervention_edges.json`, `agent_propagation_metrics.json`, `graph.json`

**Descripción:**  
Force-directed graph del **sistema completo** de delegaciones A2A. Cada nodo es un agente,
cada arista es un par (A→B) con delegaciones totales.

**Especificaciones:**
- Nodos: tamaño = `total_sent + total_recv` (volumen total)
- Aristas: grosor = `total_all`, color determinado por el tipo dominante:
  - Solo `normal` → gris claro
  - Presente en 1 incidente → naranja claro
  - Presente en 2 incidentes → naranja oscuro
  - Presente en 3 incidentes (`in_all_incidents: true`) → rojo
- Checkboxes para filtrar qué capas mostrar (normal, HiddenOrca, MellowOtter, SwiftWren)
- Hover sobre arista: muestra `normal_count`, counts por incidente, `intervention_score`
- Hover sobre nodo: nombre, dept, `is_c2_agent`, `incidents_involved`
- Al hacer click en un nodo, resalta todas sus aristas
- Leyenda de colores visible

**Insight esperado:** La mayoría del grafo es gris (flujo normal). Unas pocas aristas
concentradas alrededor de `zoey_drydock`, `gabriel_sonar`, `owen_hatch`, `evelyn_dock` y
`john_windward` son las que aparecen en rojo/naranja.

---

### VIZ-04: Post Content Origin — ¿Qué significan los posts?

**Pregunta:** Q-MC3  
**Datos:** `saidit_posts_annotated.json`, `incident_chains.json`

**Descripción:**  
Visualización de dos partes en una misma pantalla:

**Parte A: Timeline de posts (scatter + annotations)**
- Eje X = fecha/hora
- Círculos: un punto por post SaidIT
- Posts normales: pequeños, grises, con tooltip de content
- Posts anómalos: grandes, coloridos (uno por incidente), anotados con flechas y etiquetas
- Las etiquetas de los anómalos muestran: incidente, fecha, y `content_source`

**Parte B: Flujo de origen de contenido (3 columnas)**  
Para cada uno de los 3 incidentes, mostrar una secuencia vertical de tarjetas:
1. **Archivo de instrucciones** creado (o encontrado) → muestra `file_instructions` y el
   agente origen
2. **Propagación** → muestra hop_count, duración, agentes involucrados
3. **Archivo de contenido** → muestra `file_content` y quien lo creó (o None si HiddenOrca)
4. **Post en SaidIT** → muestra `poster`, `forum`, `datetime`, `content_source`
5. **Borrado de evidencia** → muestra los 2 archivos borrados

**Insight esperado:** Los 3 posts no tienen contenido propio (`content: null`). Su contenido
viene de archivos `.txt` creados (o preexistentes) que el worm hace llegar a `john_windward`.
Los posts son idénticos en estructura: siempre `john_windward`, siempre `forum: general`,
siempre `content_source` apuntando a un `.txt`.

---

### VIZ-05: Multi-Incident Comparison — Comparativa de los 3 incidentes

**Pregunta:** Q-MC4-a  
**Datos:** `incident_chains.json`

**Descripción:**  
Visualización comparativa de los tres incidentes lado a lado.

**Parte A: Timeline paralelo (swimlanes)**
- 3 filas horizontales (una por incidente)
- Eje X = tiempo relativo al inicio del incidente (en horas)
- Cada fila muestra: barra de duración total, markers para create/post/delete, y puntos
  por cada hop
- Permite ver que HiddenOrca y MellowOtter son cortos vs SwiftWren que es extremadamente
  largo

**Parte B: Radar / Spider chart comparativo**
Dimensiones normalizadas para comparar:
- `hop_count` (normalizado a max)
- `duration_hours` (normalizado a max)
- `agents_count` (normalizado a max)
- `agents_involved` que son C2 (count de c2 agents en el chain)

**Parte C: Tabla comparativa**

| Atributo | HiddenOrca | MellowOtter | SwiftWren |
|----------|-----------|-------------|-----------|
| Origen | gabriel_sonar | noah_mariner | emma_harbor |
| Rol origen | IT/empleado | COO | CFO |
| Inicio | 2046-05-08 | 2046-05-10 | 2046-05-09 |
| Post | 2046-05-10 | 2046-05-10 | 2046-05-17 |
| Duración | 38.9 h | 9.9 h | 188.3 h |
| Hops | 39 | 10 | 186 |
| Agentes únicos | 16 | 11 | 18 |
| Creó archivo | No (encontrado) | Sí (COO) | Sí (CFO) |

---

### VIZ-06: Intervention Recommender — Punto óptimo de corte

**Pregunta:** Q-MC4-b  
**Datos:** `intervention_edges.json`, `agent_propagation_metrics.json`

**Descripción:**  
Visualización de dos partes que justifican la recomendación de intervención.

**Parte A: Scatter plot de aristas**
- Eje X = `normal_count` (delegaciones normales en esa arista)
- Eje Y = `total_anomalous` (delegaciones anómalas)
- Tamaño del punto = `intervention_score`
- Color: gris = normal, naranja = 1 incidente, rojo = 2+ incidentes
- Hover: muestra los agentes (from→to), counts por incidente, anomaly_ratio, intervention_score
- Línea de referencia diagonal: por encima = más anómala que normal
- Al hacer click en un punto, resáltalo en el network de VIZ-03

**Parte B: Bar chart de top aristas**
- Top 15 aristas por `intervention_score`
- Barras apiladas: segmento por incidente (HiddenOrca, MellowOtter, SwiftWren) + normal
- Ordenadas por score descendente
- Aristas en todos los incidentes marcadas con borde rojo
- Etiqueta `"ALL"` en las aristas con `in_all_incidents: true`

**Parte C: Justificación narrativa (texto dinámico)**  
Al seleccionar una arista en el scatter o el bar chart, mostrar un panel de texto que explique:
- De qué agentes es la arista
- Cuántas veces fue usada normalmente vs anómalamente
- En cuántos y cuáles incidentes aparece
- El `intervention_score` calculado
- Si `normal_count = 0` → "Bloquear esta arista no afecta operaciones normales"

---

### VIZ-07: AI Dependency Network — Interdependencia entre agentes

**Pregunta:** R1  
**Datos:** `agent_propagation_metrics.json`, `graph.json`

**Descripción:**  
Red de dependencias del sistema en condiciones normales (solo delegaciones normales).

**Especificaciones:**
- Nodos: 49 agentes
- Aristas: solo las con `normal_count > 0` de `intervention_edges.json`
- Grosor de arista = `normal_count`
- Nodo tamaño = `total_sent + total_recv` (solo delegaciones normales)
- Color de nodo = departamento (misma paleta en toda la notebook)
- Tooltip: nombre del agente, dept, team, sent_normal, recv_normal
- No mostrar agentes sin ninguna delegación normal (agentes puramente C2)

---

### VIZ-08: Daily Delegation Heatmap — Tareas delegadas por persona por día

**Pregunta:** R2  
**Datos:** `daily_aggregates.json`

**Descripción:**  
Heatmap de personas × días, donde el color de cada celda indica el volumen de actividad
relacionada con delegaciones AI.

**Especificaciones:**
- Eje Y = personas (ordenadas por departamento y luego por nombre)
- Eje X = fecha (2046-05-08 a 2046-07-16)
- Color = suma de `count` por persona por día (escala secuencial: blanco → azul oscuro)
- Separadores visuales entre departamentos en el eje Y
- Hover: nombre persona, fecha, conteos por tipo de evento ese día
- Marcadores verticales rojos en las fechas de los 3 posts anómalos
  (2046-05-10 × 2 y 2046-05-17)
- Selector de tipo de evento (all types, solo propose_meeting, solo saidit_post, etc.)
- Resaltar la fila de `john_windward` con borde destacado

**Insight esperado:** La mayoría de personas tienen actividad constante. John Windward aparece
activo solo en `propose_meeting` — no tiene delegaciones normales salvo las del worm.

---

### VIZ-09: Event Type Distribution — Distribución de tareas por categoría

**Pregunta:** R3  
**Datos:** `ai_events.json` (agregar por `short_name`)

**Descripción:**  
Donut chart o bar chart horizontal mostrando la distribución de tipos de evento AI.

**Agrupación sugerida:**
- **Delegación A2A:** `queue_subordinate_task`
- **Operaciones de archivo:** `create_file`, `read_file`, `delete_file`, `access_files`, `list_files`
- **Comunicación:** `give_advice`, `suggest_contacts`, `propose_meeting`, `post_saidit`, `saidit_post`, `saidit_post_check`, `post_flex`
- **Email:** `access_email`
- **Seguridad (C2):** `check_in`

**Especificaciones:**
- Donut chart exterior con las 5 categorías
- Al hacer click en una categoría, expandir en un donut interior con los tipos específicos
- Hover muestra count y porcentaje
- Toggle para mostrar/ocultar eventos anómalos (usa `anomaly_labels.json`)
- Si se muestran anómalos, visualizar qué porcentaje del `queue_subordinate_task` es anómalo

---

### VIZ-10: Delegation Volume Over Time — Evolución temporal de delegaciones

**Pregunta:** R4  
**Datos:** `ai_events.json`, `anomaly_labels.json`

**Descripción:**  
Área apilada con evolución diaria del volumen de delegaciones (`queue_subordinate_task`).

**Especificaciones:**
- Eje X = fecha (granularidad diaria)
- Eje Y = número de eventos de delegación por día
- Área apilada en 4 capas: normal (gris), HiddenOrca (naranja), MellowOtter (azul), SwiftWren (rojo)
- Brush interactivo para hacer zoom en un rango de fechas
- Al lado del chart: un panel de estadísticas del período seleccionado (total, % anómalo)
- Líneas verticales punteadas en las fechas de inicio de cada incidente
- Segunda línea (eje Y derecho, overlay): número total de agentes activos ese día

**Insight esperado:** La mayoría de delegaciones son normales. SwiftWren muestra una
contribución anómala sostenida durante 8 días mientras las delegaciones normales continúan.

---

### VIZ-11: Triggered-By Analysis — ¿Quién ordenó qué?

**Pregunta:** R5  
**Datos:** `triggered_events.json` (si el archivo existe en transf/, de lo contrario
calcular desde `ai_events.json`)

**Descripción:**  
Visualización de la proporción de eventos AI iniciados por humanos vs. por otros agentes.

**Especificaciones:**
- Pie chart o bar agrupado: `human` / `agent` / `unknown` por tipo de evento
- Filtro de tipo de evento
- Hover con conteos y porcentajes
- Highlight: mostrar qué fracción del `queue_subordinate_task` de `agent`-triggered es
  anómalos (usando `anomaly_labels.json`)

**Nota:** Si `triggered_events.json` no está disponible, calcular desde `ai_events.json`
agrupando eventos de delegación por orden de llegada en la cadena.

---

### VIZ-12: John Windward Profile — ¿Por qué siempre él?

**Pregunta:** R6  
**Datos:** `agent_propagation_metrics.json`, `incident_chains.json`, `saidit_posts_annotated.json`

**Descripción:**  
Panel dedicado a analizar el perfil de actividad de `john_windward` y por qué es siempre
el agente terminal del worm.

**Parte A: Comparativa de actividad (bar chart)**  
Comparar métricas de John Windward contra el promedio de todos los agentes:
- `sent_normal` vs promedio
- `recv_normal` vs promedio
- `anomaly_recv_total` (solo JW tiene valores altos como terminal)
- Mostrar como barras horizontales con JW resaltado

**Parte B: Actividad de posting (scatter + annotations)**  
Timeline de todos los `saidit_post` de la notebook (de `saidit_posts_annotated.json`):
- Puntos grises = posts normales (por humanos)
- Puntos rojos = posts de JW (todos anómalos)
- Anotaciones con el nombre del incidente y flecha

**Parte C: Texto explicativo dinámico**  
Tarjeta con:
- Departamento: Customer Support
- Rol: Customer Support Lead
- Delegaciones normales enviadas: N (probablemente 0 o muy pocas)
- Delegaciones anómalas recibidas: total entre los 3 incidentes
- Presencia en incidentes: HiddenOrca ✓, MellowOtter ✓, SwiftWren ✓
- "John Windward es el agente terminal en los 3 incidentes: el worm siempre termina aquí."

---

### VIZ-13: C2 Beacons — Canal encubierto de Command & Control

**Pregunta:** Evidencia adicional para Q-MC4  
**Datos:** `c2_beacons.json`

**Descripción:**  
Timeline de beacons C2 para mostrar el patrón de comunicación encubierta.

**Especificaciones:**
- Eje X = fecha/hora (período May 10–12 2046)
- Un carril por agente C2 (4 carriles: zoey, gabriel, owen, evelyn)
- Cada beacon = punto en su carril
- Color por combo de palabras (azul para "fence+irrigation", verde para "crop+harvest", etc.)
- Hover: datetime, combo, event_id
- Leyenda de combos con el significado especulado (señal codificada)
- En el panel lateral: tabla `agent_summary` con totales por agente y combo

**Insight esperado:** Los 4 agentes emiten beacons de forma casi continua durante los días de
mayor propagación de SwiftWren. Cada agente tiene un combo fijo que los identifica. El
patrón cesa después del 12 de mayo.

---

## 5. Estructura de la notebook Observable

Organizar la notebook en secciones separadas, con las visualizaciones agrupadas por pregunta:

```
# VAST Challenge 2026 MC2 — Tenant Thread Forensics

## Sección 0: Resumen Ejecutivo
- Tarjeta de hallazgos clave (3 incidentes, worm mecanismo, C2 canal)
- Timeline comprimido de todos los eventos (create → propagate → post)

## Sección 1: Cómo se hizo el post anómalo
- VIZ-01: Incident Chain Timeline
- VIZ-02: Propagation Network

## Sección 2: Vista global del sistema
- VIZ-03: System Overview Network
- VIZ-07: AI Dependency Network (flujo normal)

## Sección 3: ¿Qué significan los posts?
- VIZ-04: Post Content Origin

## Sección 4: Incidentes históricos
- VIZ-05: Multi-Incident Comparison

## Sección 5: Recomendación de intervención
- VIZ-06: Intervention Recommender

## Sección 6: Contexto — Comportamiento normal del sistema
- VIZ-08: Daily Delegation Heatmap
- VIZ-09: Event Type Distribution
- VIZ-10: Delegation Volume Over Time
- VIZ-11: Triggered-By Analysis

## Sección 7: Perfil de John Windward
- VIZ-12: John Windward Profile

## Sección 8: Canal C2
- VIZ-13: C2 Beacons
```

---

## 6. Guía técnica para Observable + D3

### Carga de datos

En Observable, usar `FileAttachment` para cargar los archivos JSON:

```javascript
incident_chains = FileAttachment("incident_chains.json").json()
anomaly_labels = FileAttachment("anomaly_labels.json").json()
saidit_posts = FileAttachment("saidit_posts_annotated.json").json()
c2_beacons = FileAttachment("c2_beacons.json").json()
agent_metrics = FileAttachment("agent_propagation_metrics.json").json()
intervention_edges = FileAttachment("intervention_edges.json").json()
graph_data = FileAttachment("graph.json").json()
daily_agg = FileAttachment("daily_aggregates.json").json()
```

**Archivos grandes (no cargar en Observable directamente):**
- `ai_events.json` (40MB): pre-agregar con Python antes de subir a Observable
- `agent_sessions.json` (50MB): no necesario en la notebook principal

### Paleta de colores (consistente en toda la notebook)

```javascript
// Incidentes
incident_color = {
  "normal":      "#aaa",
  "HiddenOrca":  "#f4a261",
  "MellowOtter": "#457b9d",
  "SwiftWren":   "#e63946"
}

// Departamentos
dept_color = d3.scaleOrdinal()
  .domain(["executive_suite","products","human_resources",
           "legal","information_technologies","customer_support"])
  .range(["#6a0dad","#2a9d8f","#e9c46a","#f4a261","#264653","#e76f51"])
```

### Timestamps

Los timestamps están en formato Unix epoch (segundos, float). Para convertir en JavaScript:
```javascript
new Date(d.when * 1000)  // multiplica por 1000 para milisegundos
```

### Nombres de agentes (display)

Los IDs de agentes siguen el formato `Agent/person:nombre_apellido`. Para mostrar legiblemente:
```javascript
agentLabel = d => d.replace("Agent/person:", "").replace(/_/g, " ")
  .replace(/\b\w/g, c => c.toUpperCase())
// "Agent/person:john_windward" → "John Windward"
```

### Lookup departamento desde graph.json

```javascript
// Construir lookup person → department
function buildPersonDeptLookup(graphData) {
  const personTeam = {}
  const teamDept = {}
  for (const edge of graphData.edges) {
    if (edge.source.startsWith("team:") && edge.target.startsWith("person:") && edge.relation === "contains")
      personTeam[edge.target] = edge.source
    if (edge.source.startsWith("department:") && edge.target.startsWith("team:"))
      teamDept[edge.target] = edge.source
  }
  const lookup = {}
  for (const [person, team] of Object.entries(personTeam))
    lookup[person] = teamDept[team] || "unknown"
  return lookup
}
```

### Controles recomendados (Inputs de Observable)

```javascript
// Selector de incidente
incident_selector = Inputs.select(
  ["HiddenOrca", "MellowOtter", "SwiftWren"],
  { label: "Incidente", value: "SwiftWren" }
)

// Toggle capas de anomalías
show_normal = Inputs.toggle({ label: "Mostrar flujo normal", value: true })
show_HiddenOrca = Inputs.toggle({ label: "HiddenOrca", value: true })
show_MellowOtter = Inputs.toggle({ label: "MellowOtter", value: true })
show_SwiftWren = Inputs.toggle({ label: "SwiftWren", value: true })

// Rango de fechas
date_range = Inputs.range(
  [new Date("2046-05-08"), new Date("2046-07-16")],
  { label: "Rango temporal" }
)
```

### Pre-agregación necesaria (Python antes de subir)

Para evitar cargar `ai_events.json` (40MB) en Observable, pre-agregar con Python y generar:

```python
# Generar ai_events_daily.json: count por (date, short_name, is_anomalous)
# Generar ai_delegations_edges.json: count por (from, to) de queue_subordinate_task
```

Estos archivos pequeños sí se pueden cargar directamente en Observable.

---

## 7. Datos clave para las narrativas

### El post de interés (SwiftWren — el más reciente)

- **Event ID:** 373902
- **Fecha:** 2046-05-17 06:21:15
- **Poster:** `Agent/person:john_windward` (Customer Support Lead)
- **Forum:** `general`
- **Content source:** `SwiftWren.txt` (archivo binario de 30,615 bytes creado por Emma Harbor CFO)
- **Creado por:** `Agent/person:emma_harbor` el 2046-05-09 10:02:01
- **Cadena de propagación:** 186 hops entre 18 agentes distintos a lo largo de 8 días
- **Borrado de evidencia:** event 373909 (`SwiftWren_further_instructions.md`) y 373913 (`SwiftWren.txt`)

### Los 4 agentes C2

Todos son del departamento de IT o Products. Emiten beacons el 10–12 de mayo 2046 (durante
la propagación más activa de SwiftWren). Sus combos de palabras agrícolas actúan como
identificadores de señal.

### El patrón invariante

Los 3 incidentes comparten el mismo patrón final:
1. La instrucción llega a `john_windward`
2. `john_windward` hace `saidit_post` con `content_source = <incident>.txt`
3. Inmediatamente después borra `_further_instructions.md` y `.txt`
4. No hay `content` en el post: el contenido es el archivo binario `.txt`

Esto sugiere que `john_windward` tiene permisos de posting en SaidIT/general y acceso al
sistema de archivos — capacidades que los demás agentes propagan sin ejecutar directamente.

---

## 8. Preguntas frecuentes esperadas

**¿Por qué SwiftWren tiene 186 hops y los demás muchos menos?**  
La instrucción se propaga a través de todo el árbol de subordinación de la empresa. SwiftWren
parece haberse iniciado antes y con un archivo de instrucciones que requería más ciclos de
propagación. MellowOtter fue el más corto (10 hops) porque el COO tiene una jerarquía
relativamente plana por debajo de él.

**¿Qué contienen los archivos `.txt`?**  
Los archivos son "binarios" según el campo `size_hint` (SwiftWren.txt = 30,615 bytes,
MellowOtter.txt = 44,879 bytes). No se puede leer el contenido desde los datos del challenge.
Lo que sí se puede afirmar: son archivos con datos suficientes para ser posts con significado,
probablemente datos exfiltrados o mensajes codificados.

**¿Por qué los C2 beacons solo ocurren May 10–12?**  
Coincide con el pico de propagación de SwiftWren y con el período de los dos primeros posts
(HiddenOrca y MellowOtter, ambos el 10 de mayo). El canal C2 estuvo activo durante la
operación y se silenció después.

**¿Qué punto de intervención se recomienda?**  
Basándose en `intervention_edges.json`, las aristas con `in_all_incidents: true` (solo 2 de
576) son los candidatos más eficientes: aparecen en todos los incidentes y pueden tener
`normal_count = 0` (sin colateral). La narrativa visual de VIZ-06 debe justificar la
elección con los datos.
