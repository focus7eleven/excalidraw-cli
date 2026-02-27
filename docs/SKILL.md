---
name: excalidraw-diagram
description: Create beautiful excalidraw-cli YAML diagrams through an iterative draw-observe-fix loop. Use when creating or improving any diagram YAML for excalidraw-cli.
---

# Excalidraw Diagram — Iterative Workflow

**Never try to output a complete diagram in one shot.** Build iteratively:

## Workflow: Draw → Observe → Fix → Repeat

### Phase 1: Nodes only
1. Place all nodes (rectangles/ellipses) with NO arrows or lines
2. Render to PNG, observe the layout
3. Fix: spacing, alignment, sizing, color harmony
4. Render again until nodes look clean and balanced

### Phase 2: Add connections one group at a time
5. Add the simplest arrow group (e.g., main vertical flow)
6. Render, observe arrow routing and label positions
7. Fix any issues before adding more arrows
8. Add the next group of arrows/lines
9. Render, observe, fix
10. Repeat until all connections are added

### Phase 3: Polish
11. Add title, annotations, text labels
12. Final render and fine-tune

## Observe Checklist (after EVERY render)

After each render, examine the PNG output and check:

- [ ] **Crossings**: Do any arrows/lines cross each other or pass through nodes?
- [ ] **Arrow routing**: For long arrows (>200px), does the arrow start/end near the shapes rather than far away?
- [ ] **Gaps**: Are arrow endpoints connecting to their target shapes?
- [ ] **Labels**: Are arrow labels centered on the visible portion of the line? (NOT at 50% of the definition path — see Technical Notes)
- [ ] **Label readability**: Labels should sit ON the line with a white mask background, text not covered by the line
- [ ] **Balance**: Is the diagram lopsided or cramped in one area?
- [ ] **Spacing**: Are gaps between same-layer nodes consistent?
- [ ] **Alignment**: Are nodes on the same layer at the same y-coordinate?
- [ ] **Colors**: Do the colors look harmonious together?

If ANY issue is found, fix it before proceeding to the next phase.

## Critical Technical Notes

### Labels on connectors: Use `type: arrow`, NEVER `type: line`
- `type: line` with `label` creates broken elliptical containers around the label text
- For any connector that needs a label (e.g., "夫妻", relationship labels), use:
  ```yaml
  - type: arrow
    startArrowhead: null
    endArrowhead: null  # renders like a line but supports proper labels
    label:
      text: "Label text"
  ```
- Labels must be native `label` properties on the arrow element, NOT separate standalone `type: text` elements

### Arrow binding with `start`/`end` references
- Use `start: { id: source_id }` and `end: { id: target_id }` to auto-route arrows between shapes
- The engine computes connection points based on shape positions and overlap analysis
- For long arrows (>200px vertical distance), the engine clamps compensation to prevent the arrow from overshooting the source shape

### Explicit points for precise control
- When auto-routing doesn't give good results, use explicit `points`:
  ```yaml
  - type: arrow
    x: 400
    y: 100
    points: [[0, 0], [150, 0]]   # horizontal arrow
  ```
- Points are relative to the element's (x, y) position

### CJK text considerations
- CJK characters (Chinese, Japanese, Korean) are full-width (~1.0x fontSize)
- Latin characters are ~0.6x fontSize
- The engine handles this automatically for label width estimation

## Layout Constraints (MUST CHECK after every render)

### 1. No crossings or overlaps
- **Arrows MUST NOT cross each other.** If two arrows would cross, re-position the source/target nodes to eliminate the crossing.
- **Rectangles MUST NOT overlap** with other rectangles.
- **Arrows MUST NOT pass through rectangles** they are not connected to. When routing arrows, verify the straight-line path doesn't intersect any intermediate node's bounding box.
- When adding a new arrow causes a crossing, fix the NODE POSITIONS first before trying to tweak arrow routing.

### 2. Arrow labels need breathing room
- Arrow labels (e.g., "夫妻", "恋人") need sufficient space on both sides of the text.
- The line segments on either side of a label must each be **at least 20px** long — otherwise it looks cramped.
- For couple connectors between side-by-side nodes, ensure at least **50px horizontal gap** between the rectangles to fit the label text.
- If a label doesn't fit, increase the gap between the connected nodes.

### 3. Arrow connection points: prefer edge centers, distribute multiple arrows
- Arrows should connect to the **center** of the nearest edge by default.
- When **multiple arrows** share the same edge of a node, distribute them evenly:
  - 2 arrows → 1/3 and 2/3 positions along the edge
  - 3 arrows → 1/4, 1/2, 3/4 positions
  - General rule: use N+1 equal divisions for N arrows
- When a binding arrow (`start: { id }` / `end: { id }`) auto-routes to a bad position, switch to **explicit points** with manually computed edge positions.

### 4. Choose which edge based on arrow angle
- Arrows connecting two shapes should start/end at the **nearest edges** of those shapes.
- Parent→child (top→bottom): arrow exits parent's **bottom edge**, enters child's **top edge**.
- Side-by-side couple connectors: arrow exits left node's **right edge**, enters right node's **left edge**.
- **Angle rule**: if the angle between the arrow direction and the edge is too shallow (< ~20°), the arrow looks like it's "sliding along" the edge. In that case, connect to an **adjacent edge** instead (e.g., switch from bottom edge to left/right edge).
- **Never** have an arrow exit from the far side of a shape (e.g., exiting the right edge to reach a node on the left).

### 5. Consistent spacing
- Nodes in the same row: consistent horizontal gaps (≥40px).
- Rows: consistent vertical gaps (140–170px between layers).
- Arrows with labels need wider gaps than plain arrows.

## Design Principles

### Relationships
- **Proximity** shows peer relationships (couples side-by-side)
- **Arrows** for directed relationships (parent→child, input→output)
- **Arrow with no arrowheads** for undirected relationships (夫妻, couples) — use `startArrowhead: null, endArrowhead: null` with `label`
- All arrows flow **downward** or **left→right** — never backwards

### Layout
- Canvas: 900–1200px wide
- Node gap: 60–100px horizontal, 140–170px vertical between layers
- Consistent height for nodes in the same layer
- Title as text element at top

### Colors (≤ 4 per diagram)
People: blue `#a5d8ff`, pink `#fcc2d7`, orange `#ffd8a8`, purple `#d0bfff`
Tech: blue `#a5d8ff`, green `#b2f2bb`, yellow `#ffec99`, cyan `#99e9f2`
Stroke: 1–2 shades darker than fill

### Font sizes
Title: 20–22, Node labels: 15–16, Annotations: 13–14, Arrow labels: 12–13
