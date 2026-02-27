# Agent Setup Guide

How to give any Claude Code agent the ability to create Excalidraw diagrams.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Clone the repo](#step-1-clone-the-repo)
- [Step 2: Install dependencies](#step-2-install-dependencies)
- [Step 3: Install the skill](#step-3-install-the-skill)
- [Step 4: Verify](#step-4-verify)
- [Usage](#usage)
- [How it works](#how-it-works)
- [Troubleshooting](#troubleshooting)

## Overview

excalidraw-cli gives agents two things:

1. **A CLI tool** — `bun run bin/cli.ts render input.yaml -o output.png` converts YAML diagram definitions into pixel-perfect PNG/SVG images.
2. **A skill** — a structured prompt (`.claude/skills/excalidraw-diagram/SKILL.md`) that teaches the agent how to create diagrams iteratively through a draw-observe-fix loop.

Once installed, the agent can create any diagram — architecture diagrams, flowcharts, family trees, ER diagrams, org charts — by writing YAML and rendering it.

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- A Chromium-compatible environment (Puppeteer downloads its own Chromium on `bun install`)

## Step 1: Clone the repo

Clone to a known location on the machine where the agent runs:

```bash
git clone https://github.com/focus7eleven/excalidraw-cli.git ~/tools/excalidraw-cli
```

## Step 2: Install dependencies

```bash
cd ~/tools/excalidraw-cli
bun install
```

This installs all dependencies including Puppeteer's bundled Chromium (~170MB). First render will be slow; subsequent renders reuse the browser binary.

## Step 3: Install the skill

Symlink the skill directory into the agent's global skills folder:

```bash
mkdir -p ~/.claude/skills
ln -sf ~/tools/excalidraw-cli/.claude/skills/excalidraw-diagram ~/.claude/skills/excalidraw-diagram
```

This makes the skill available to Claude Code in any project. The skill is automatically loaded when the agent needs to create or edit diagrams.

### Alternative: project-level install

To make the skill available only within a specific project:

```bash
cd /path/to/your-project
mkdir -p .claude/skills
ln -sf ~/tools/excalidraw-cli/.claude/skills/excalidraw-diagram .claude/skills/excalidraw-diagram
```

## Step 4: Verify

Test that the CLI works:

```bash
cd ~/tools/excalidraw-cli
bun run bin/cli.ts render test/fixtures/simple-rect.json -o /tmp/test.png
```

You should see:

```
Loading: .../simple-rect.json
Transforming elements...
Rendering PNG via browser...
Output: /tmp/test.png
```

Check that `/tmp/test.png` contains a blue rectangle labeled "Hello World".

## Usage

Once installed, the agent creates diagrams by:

### 1. Writing a YAML file

The agent writes a `.yaml` file with `meta` and `elements` keys. See the [YAML Schema](../README.md#yaml-schema) in the README for the full reference.

```yaml
meta:
  theme: light

elements:
  - type: rectangle
    id: client
    x: 100
    y: 50
    width: 200
    height: 80
    backgroundColor: "#a5d8ff"
    fillStyle: solid
    label:
      text: "Client"

  - type: rectangle
    id: server
    x: 100
    y: 250
    width: 200
    height: 80
    backgroundColor: "#b2f2bb"
    fillStyle: solid
    label:
      text: "Server"

  - type: arrow
    id: request
    start: { id: client }
    end: { id: server }
```

### 2. Rendering to PNG

```bash
bun run ~/tools/excalidraw-cli/bin/cli.ts render diagram.yaml -o diagram.png
```

### 3. Observing the output

The agent reads the PNG with its vision capability and checks:

- Are shapes aligned and evenly spaced?
- Do arrows connect cleanly without crossing?
- Are labels readable?
- Do arrows pass through unrelated shapes?

### 4. Fixing and re-rendering

Based on what it sees, the agent edits the YAML and renders again. This loop repeats until the diagram looks good.

### The iterative workflow matters

The skill enforces a phased approach:

| Phase | What to do | Why |
|-------|-----------|-----|
| **Phase 1** | Place shapes only, no arrows | Get the layout right first |
| **Phase 2** | Add arrows one group at a time | Catch routing issues early |
| **Phase 3** | Add titles, annotations | Polish last |

Render after every change. Never try to output a complete diagram in one shot — even small coordinate errors compound into crossing arrows and overlapping shapes.

## How it works

```
Agent writes YAML
       |
       v
  [excalidraw-cli render]
       |
       v
  Parse YAML (Zod validation)
       |
       v
  Build element skeletons (resolve IDs, compute arrow bindings)
       |
       v
  convertToExcalidrawElements (via @excalidraw/excalidraw in jsdom)
       |
       v
  Render in Chromium (Puppeteer + @excalidraw/utils)
       |
       v
  PNG (exportToBlob) or SVG (exportToSvg)
       |
       v
  Agent reads PNG, evaluates, edits YAML, re-renders
```

The rendering uses a real Chromium browser with the official `@excalidraw/utils` library. Output is pixel-identical to excalidraw.com — including hand-drawn style, fonts (Virgil, Excalifont), and proper arrow routing.

## Troubleshooting

### `Puppeteer is not installed`

Run `bun install` in the excalidraw-cli directory. Puppeteer is a dependency and installs its own Chromium binary.

### First render is slow

The first render launches Chromium and loads the 19MB Excalidraw bundle. Takes 5-10 seconds. Subsequent renders in the same session are faster.

### `Browser rendering failed: The browser is already running`

A previous render left a stale Chrome process. Kill it:

```bash
pkill -f "chrome.*puppeteer"
```

### Arrows route to wrong edges

When `start: { id }` / `end: { id }` binding produces bad arrow paths, switch to explicit `points`:

```yaml
# Instead of this:
- type: arrow
  start: { id: a }
  end: { id: b }

# Use this:
- type: arrow
  x: 200        # start point
  y: 140
  points: [[0, 0], [0, 120]]   # [dx, dy] from start
```

Calculate edge positions manually: for a shape at `(x, y, width, height)`, the edge centers are:
- Top: `(x + width/2, y)`
- Bottom: `(x + width/2, y + height)`
- Left: `(x, y + height/2)`
- Right: `(x + width, y + height/2)`

### Labels on lines render incorrectly

Use `type: arrow` with `startArrowhead: null` and `endArrowhead: null` instead of `type: line`. See [Labeled connectors](../README.md#3-labeled-connectors-couples-relationships).
