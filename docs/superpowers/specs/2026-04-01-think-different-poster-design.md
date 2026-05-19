# "Think Different" Animated Poster — Design Spec

## Overview

A single-page p5.js animated poster recreating the aesthetic of the viral Xiaohongshu "飞走的情书" (Flying Love Letter) poster, but with Steve Jobs' complete "Think Different" speech as the text content.

## Animation Timeline

The animation runs through 4 sequential phases, driven by a `millis()`-based state machine:

### Phase 1 — Typewriter Reveal (0–8s)
- Full "Think Different" text types out letter by letter at ~50ms per character
- Each character appears with a slight scale-in pop
- Text sits at the lower third of the page in typewriter font

### Phase 2 — Pause (8–11s)
- 3-second stillness with complete text visible on parchment background

### Phase 3 — "O" Cascade (11–16s)
- All "o" letters detach from their positions one by one (~300ms apart)
- Each "o" scales up (1× → 3×) as it rises toward the center of the page
- A wavy bezier curve trails from each "o" back to its original text position
- The trailing line sways gently using sine-wave offset perturbation
- As "o"s rise, they pull the remaining text block upward
- Entire text block accelerates off the top of the page and disappears

### Phase 4 — Closing Fade (16–18s)
- After all text clears the viewport, "Think Different." fades in at center
- ~48px, bold typewriter font, ~1.5s fade-in with ease-in
- Parchment background remains as final state

## Visual Specifications

| Property | Value |
|----------|-------|
| Canvas size | 720×1080 (portrait) |
| Background | Procedural parchment: `#f4e8d1` base + Perlin noise grain + radial vignette |
| Font | "Special Elite" from Google Fonts (typewriter style) |
| Text color | `#2c2416` (dark brown, aged ink) |
| Body text size | ~16px |
| Line height | ~40px |
| Text position | Lower third of canvas, left-aligned |
| "O" balloon scale | 1× → 3× during ascent |
| "O" balloon color | `#3d3020` (slightly lighter than body text) |
| Trailing lines | `strokeWeight(1.5)`, `#2c2416` at 40% opacity, wavy bezier |
| Final text | "Think Different." centered, ~48px, bold |

## Technical Architecture

### File Structure

```
think-different-poster/
└── index.html          # Single file — p5.js instance mode, all logic inline
```

### p5.js Instance Mode

- Uses `new p5(sketch, container)` pattern
- `preload()` — loads "Special Elite" font via `loadFont()`
- `setup()` — creates 720×1080 canvas, calculates character positions
- `draw()` — state machine driven by `millis()`

### State Machine

```
STATE_TYPEWRITER → STATE_PAUSE → STATE_CASCADE → STATE_CLOSING
```

Transitions triggered by elapsed time thresholds:
- Typewriter → Pause: when all characters revealed (~8s)
- Pause → Cascade: after 3s pause (~11s total)
- Cascade → Closing: when all "o"s have cleared viewport (~16s)
- Closing: final state, no further transitions

### Data Structures

**Character grid:**
```javascript
textLines = [
  {
    chars: [
      {char: 'H', x: 72, y: 720, visible: false, isO: false},
      {char: 'e', x: 84, y: 720, visible: false, isO: false},
      // ...
    ]
  },
  // ... one entry per line of text
]
```

**"O" balloons:**
```javascript
oBalloons = [
  {
    originX: 120, originY: 760,     // original position in text
    currentX: 360, currentY: 300,    // animated position
    scale: 1.0,                       // grows during ascent
    trailPoints: [],                  // [{x, y, time}]
    active: false,                    // becomes true when this "o" detaches
    oIndex: 0                         // cascade order index
  },
  // ... one per "o" in the text
]
```

### Parchment Background Generation

Procedural, no external assets:
1. Base fill: `#f4e8d1`
2. Perlin noise grain overlay at 8% opacity (sampled at 4× resolution for softness)
3. Radial vignette: darker ellipse at edges using `drawingContext` radial gradient

### Typewriter Effect

- Characters revealed sequentially at 50ms intervals
- Each character pops in with `scale(1.2)` → `scale(1.0)` over 100ms
- Spaces and punctuation count as characters (typed at same speed)
- Line breaks handled by advancing to next line in `textLines`

### "O" Cascade Physics

- "O" letters detach in order of appearance in text (left-to-right, top-to-bottom)
- Each "o" launches ~300ms after the previous one
- Ascent path: quadratic bezier from origin to a target near canvas center
- Target positions are slightly randomized (±20px) for organic feel
- Text block Y offset accelerates upward: `textOffsetY -= easeInQuad(elapsed) * pullStrength`
- When text block Y < -totalTextHeight, all text has cleared viewport

### Trailing Lines

- Each active "o" maintains a trail of ~60 recent positions
- Rendered as a bezier curve through trail points
- Sine-wave perturbation: `offsetX = sin(frameCount * 0.05 + pointIndex * 0.3) * 8`
- Oldest trail points dropped to prevent memory growth
- Line opacity fades slightly toward the "o" end

### Final Text Fade

- "Think Different." drawn centered at canvas midpoint
- Alpha goes from 0 → 255 over ~1.5s using `easeIn` curve
- Font: same "Special Elite", 48px, bold weight

## Dependencies

- p5.js v1.9+ (loaded from CDN: `https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js`)
- Google Fonts "Special Elite" (loaded via `<link>` tag)
- No build tools, no npm, no bundler

## Full Text Content

The complete "Think Different" speech text (1997 WWDC), arranged in paragraphs:

```
Here's to the crazy ones. The misfits. The rebels. The troublemakers.
The round pegs in the square holes. The ones who see things differently.
They're not fond of rules. And they have no respect for the status quo.

You can quote them, disagree with them, glorify or vilify them.
About the only thing you can't do is ignore them.
Because they change things. They push the human race forward.

And while some may see them as the crazy ones, we see genius.
Because the people who are crazy enough to think they can change the world,
are the ones who do.
```

Note: This is the commonly cited "complete" version from the 1997 Apple WWDC keynote. The "o" count in this text is approximately 25-30, which at 300ms spacing means the cascade phase will take ~8-9s total. The 11-16s window in the timeline is approximate — actual duration will be tuned during implementation.

## Output Location

The file will be created at:
```
/Users/joeytoday/github-qc/qwen-code-examples/vibe/brochure/think-different-poster/index.html
```
