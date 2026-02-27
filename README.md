# excalidraw-cli

A CLI that converts declarative YAML/JSON into pixel-perfect Excalidraw PNG/SVG. Built for AI agents — write YAML, render, observe the output, fix, repeat.

## Table of Contents

- [Quick Start](#quick-start)
- [CLI Reference](#cli-reference)
- [YAML Schema](#yaml-schema)
  - [Element Types](#element-types)
  - [Common Properties](#common-properties)
  - [Shapes](#shapes-rectangle-ellipse-diamond)
  - [Text](#text)
  - [Arrows](#arrows)
- [Rendering Pipeline](#rendering-pipeline)
- [Agent Workflow](#agent-workflow)
  - [Iterative Loop](#iterative-loop)
  - [Layout Rules](#layout-rules)
  - [Design Palette](#design-palette)
- [Examples](#examples)
- [Agent Installation Guide](#agent-installation-guide)
- [Development](#development)

## Quick Start

```bash
bun install
```

```bash
# YAML → PNG
bun run bin/cli.ts render diagram.yaml -o output.png

# YAML → SVG
bun run bin/cli.ts render diagram.yaml -o output.svg

# Native .excalidraw files also work
bun run bin/cli.ts render drawing.excalidraw -o output.png
```

## CLI Reference

```
excalidraw-cli render <input> -o <output> [options]

Arguments:
  input                   Input file (.yaml, .yml, .json, .excalidraw)

Options:
  -o, --output <path>     Output file (.png or .svg)           [required]
  -t, --theme <theme>     "light" (default) or "dark"
  -s, --scale <number>    PNG scale factor (default: 2)
  -p, --padding <number>  Export padding in px (default: 10)
  -b, --background <color> Background color override
  -q, --quiet             Suppress output
  -v, --verbose           Debug logging
```

## YAML Schema

Every diagram is a YAML file with two top-level keys:

```yaml
meta:                          # optional
  title: "Diagram Title"
  theme: light                 # light | dark
  background: "#f8f9fa"        # any hex color

elements:                      # required, list of elements
  - type: rectangle
    id: box1
    ...
```

### Element Types

| Type | Description |
|------|-------------|
| `rectangle` | Rectangle with optional label |
| `ellipse` | Ellipse with optional label |
| `diamond` | Diamond with optional label |
| `text` | Standalone text |
| `arrow` | Arrow or labeled connector |
| `line` | Line (no label support — use arrow with null arrowheads instead) |
| `freedraw` | Freehand drawing |
| `frame` | Frame container |
| `image` | Image placeholder |

### Common Properties

All elements support:

```yaml
id: my_id              # string, auto-generated if omitted
x: 100                 # position (default: 0)
y: 200
width: 200             # size (default: 200x100 for shapes)
height: 100
strokeColor: "#1e1e1e"
backgroundColor: "#a5d8ff"
fillStyle: solid       # solid | hachure | cross-hatch
strokeWidth: 2
strokeStyle: solid     # solid | dashed | dotted
roughness: 1           # 0 (clean) to 2 (sketchy)
opacity: 100           # 0-100
rotation: 0            # degrees
groupIds: [g1]         # grouping
```

### Shapes (rectangle, ellipse, diamond)

```yaml
- type: rectangle
  id: server
  x: 100
  y: 100
  width: 200
  height: 80
  backgroundColor: "#a5d8ff"
  fillStyle: solid
  strokeColor: "#1971c2"
  label:
    text: "API Server"
    fontSize: 16
    fontFamily: 1         # 1=Virgil, 2=Helvetica, 3=Cascadia, 5=Excalifont
    textAlign: center     # left | center | right
    verticalAlign: middle # top | middle | bottom
    strokeColor: "#1e1e1e"
```

### Text

```yaml
- type: text
  id: title
  x: 100
  y: 0
  text: "System Architecture"
  fontSize: 22
  fontFamily: 1
  textAlign: left
  strokeColor: "#343a40"
```

Width/height are auto-calculated from text content if omitted.

### Arrows

Three routing methods:

#### 1. Binding arrows (auto-routed between shapes)

```yaml
- type: arrow
  id: flow1
  start: { id: source_shape }
  end: { id: target_shape }
```

The engine auto-computes connection points based on relative shape positions. When multiple arrows share the same edge, they distribute evenly (1/3, 1/4 positions).

#### 2. Explicit points (precise control)

```yaml
- type: arrow
  id: flow2
  x: 300            # base position
  y: 140
  points: [[0, 0], [0, 120]]   # relative to (x, y)
```

Use explicit points when auto-routing produces bad results (wrong edge, bad angle, passing through other shapes).

#### 3. Labeled connectors (couples, relationships)

For connectors that need a label but no arrowheads, use `type: arrow` with null arrowheads:

```yaml
- type: arrow
  id: couple
  x: 200
  y: 112
  points: [[0, 0], [60, 0]]
  strokeColor: "#e03131"
  strokeWidth: 2
  strokeStyle: dashed        # optional: dashed for informal relationships
  startArrowhead: null       # renders like a line
  endArrowhead: null
  label:
    text: "married"
    fontSize: 12
    strokeColor: "#e03131"
```

> **Never use `type: line` with labels** — it renders broken elliptical containers. Always use `type: arrow` with null arrowheads.

#### Arrow properties

```yaml
startArrowhead: arrow    # arrow | bar | dot | triangle | null
endArrowhead: arrow      # default: "arrow" for type: arrow
```

## Rendering Pipeline

```
YAML/JSON -> Zod validation -> Skeleton builder -> convertToExcalidrawElements (jsdom)
  -> Puppeteer (Chromium) -> exportToBlob (PNG) / exportToSvg (SVG)
```

- Rendering runs in a real Chromium browser via Puppeteer
- Uses `@excalidraw/utils` for pixel-perfect output identical to excalidraw.com
- All fonts (Virgil, Excalifont, etc.) are bundled — no external loading needed

## Agent Workflow

This CLI is built for agents to create diagrams through an iterative loop. The full workflow spec is in [`docs/SKILL.md`](docs/SKILL.md).

### Iterative Loop

**Never output a complete diagram in one shot.** Build iteratively:

1. **Phase 1 — Nodes only**: Place all shapes with NO arrows. Render, observe, fix spacing/alignment.
2. **Phase 2 — Connections**: Add arrows one group at a time. Render after each group, fix routing issues.
3. **Phase 3 — Polish**: Add titles, annotations, labels. Final render and fine-tune.

After each render, read the PNG output and check: crossings, overlaps, arrow routing, label readability, spacing, alignment. Fix any issue before proceeding.

### Layout Rules

1. **No crossings or overlaps** — arrows must not cross each other or pass through unrelated shapes. Rectangles must not overlap.
2. **Arrow labels need breathing room** — at least 20px of line on each side of a label. At least 50px gap between shapes for couple connectors.
3. **Prefer edge centers** — arrows connect to the center of the nearest edge. Multiple arrows on the same edge distribute evenly (N arrows -> N+1 equal divisions).
4. **Choose edge by angle** — if the arrow angle is too shallow relative to an edge (< 20deg), connect to an adjacent edge instead.
5. **Consistent spacing** — 60-100px horizontal gaps, 140-170px vertical gaps between layers.

### Design Palette

**Colors (pick <= 4 per diagram):**

| Category | Fill | Stroke |
|----------|------|--------|
| Blue | `#a5d8ff` | `#1971c2` |
| Pink | `#fcc2d7` | `#c2255c` |
| Orange | `#ffec99` | `#e67700` |
| Purple | `#d0bfff` | `#7048e8` |
| Green | `#b2f2bb` | `#2f9e44` |
| Cyan | `#99e9f2` | `#0c8599` |

**Font sizes:** Title 20-22, Node labels 15-16, Annotations 13-14, Arrow labels 12-13

**Canvas:** 900-1200px wide

## Examples

### Minimal: two boxes with arrow

```yaml
meta:
  theme: light

elements:
  - type: rectangle
    id: a
    x: 100
    y: 50
    width: 200
    height: 80
    backgroundColor: "#a5d8ff"
    fillStyle: solid
    label:
      text: "Box A"

  - type: rectangle
    id: b
    x: 100
    y: 250
    width: 200
    height: 80
    backgroundColor: "#ffec99"
    fillStyle: solid
    label:
      text: "Box B"

  - type: arrow
    id: arr
    start: { id: a }
    end: { id: b }
```

### Complex: family tree with relationships

See [`test/fixtures/game-of-thrones.yaml`](test/fixtures/game-of-thrones.yaml) — demonstrates:
- Multi-generational layout with 3 family groups
- Color-coded houses (purple, blue, orange, green)
- Couple connectors with CJK labels
- Mixed routing: binding arrows for vertical flows, explicit points for precise control
- Annotations and text labels

### Architecture diagram

See [`test/fixtures/project-architecture.yaml`](test/fixtures/project-architecture.yaml) — demonstrates:
- 7-layer vertical flow
- Auto-routed binding arrows with edge spread distribution
- Side connections

## Agent Installation Guide

See [`docs/AGENT_SETUP.md`](docs/AGENT_SETUP.md) for a step-by-step guide on how to install excalidraw-cli as a skill for any Claude Code agent.

## Development

```bash
bun test              # run tests
bun run bin/cli.ts    # run CLI
```
