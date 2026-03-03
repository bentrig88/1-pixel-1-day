
# 1 Pixel 1 Day — CLAUDE.md

## Project Overview
A React + TypeScript + Vite + Framer Motion app where each pixel = one day of the year.
- **Past days**: gray (`#b0b0b0`)
- **Today**: red (`#cc2200`)
- **Future days**: dark (`#2a2a2a`)

The year "2026" is rendered as pixel art where each filled square = one day, totalling exactly 365 squares.

---

## Tech Stack
- React + TypeScript + Vite
- Framer Motion (animations, zoom)
- CSS Modules
- No external UI libraries

---

## File Structure
```
src/
  data/
    pixelFont.ts       — digit bitmaps (0-9), DIGIT_WIDTH=11, DIGIT_HEIGHT=17, countFilledCells()
    yearLayout.ts      — buildYearLayout(), findBestHeight(), scaleBitmap(), getDayOfYear()
  hooks/
    useYear.ts         — returns { layout, days, todayDayIndex, daysLeft }
  components/
    YearView/
      YearView.tsx     — renders bgRows × bgCols CSS grid; exports GridLayout interface
      YearView.module.css
    Pixel/
      Pixel.tsx        — single day square, motion.div with whileHover scale, isSelected/isDimmed props
      Pixel.module.css — .past / .today / .future / .hasReminder
    DayDetail/
      DayDetail.tsx    — day detail UI (date, textarea, save button), fades in over zoomed pixel
      DayDetail.module.css — color schemes per day state (past/today/future)
    TopBar/
      TopBar.tsx       — shows today's date + days remaining
  App.tsx              — camera zoom logic, state management, keyboard navigation, resize listener
  App.module.css
  index.css            — CSS variables, global styles
```

---

## Key Algorithms

### `findBestHeight` (yearLayout.ts)
Iterates heights 7–60, scales all 4 digit bitmaps via nearest-neighbor, counts total filled cells, picks the height with minimum `|total - daysInYear|`. This automatically ensures total = 365 (or 366 for leap years). New font bitmaps don't need to hit 365 manually — the scaler handles it.

### `scaleBitmap` (yearLayout.ts)
Nearest-neighbor vertical scaling: `srcRow = floor((row / targetHeight) * srcHeight)`.

### Camera Zoom (App.tsx)
```ts
const ZOOM = DETAIL_SIZE / pixelSize   // dynamic: zoomed pixel === DayDetail size
zoomX = ZOOM * (viewW / 2 - pixelCenterX)
zoomY = ZOOM * (viewH / 2 - pixelCenterY)
```
Applied via `<motion.div animate={{ x: zoomX, y: zoomY, scale: ZOOM }}>`.
The entire grid zooms and pans so the selected pixel is centered. DayDetail fades in on top.

---

## Layout Constants
```ts
const DIGIT_GAP = 1        // empty columns between digits
const PADDING_ROWS = 4     // empty rows above and below year number
const DETAIL_SIZE = 400    // px — DayDetail square size; ZOOM is derived from this
const TOP_BAR_H = 40       // pixels reserved for top bar
const MIN_SIDE_COLS = 4    // empty columns guaranteed on each side of the year grid
const ZOOM_DURATION = 0.55 // grid zoom is 0.7s; DayDetail starts fading in 150ms early
```

---

## CSS Variables (index.css)
```css
--color-bg: #e8e8e8
--color-pixel-past: #b0b0b0
--color-pixel-today: #cc2200
--color-pixel-future: #2a2a2a
--font-mono: monospace
```

---

## DayInfo Shape (useYear.ts)
```ts
interface DayInfo {
  dayIndex: number      // 0-based (0 = Jan 1)
  date: Date
  state: 'past' | 'today' | 'future'
  hasReminder: boolean
  reminder: string
}
```

---

## GridLayout Shape (YearView.tsx)
```ts
interface GridLayout {
  pixelSize: number
  gap: number
  cellSize: number      // pixelSize + gap
  bgCols: number
  bgRows: number
  yearOffsetCol: number
  yearOffsetRow: number
  gridW: number
  gridH: number
}
```

---

## Pixel Size Formula (App.tsx)
```ts
const pixelSize = Math.max(1, Math.floor(
  Math.min(
    viewW / ((layout.gridCols + MIN_SIDE_COLS * 2) * 1.15),
    viewH / (layout.gridRows * 1.15),
  )
))
```
The `1.15` factor accounts for the gap (`cellSize ≈ pixelSize × 1.15`). `MIN_SIDE_COLS * 2` guarantees padding on both sides so the year is never cropped.

---

## Responsive Viewport (App.tsx)
```ts
const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })
useEffect(() => {
  function onResize() { setViewport({ w: window.innerWidth, h: window.innerHeight }) }
  window.addEventListener('resize', onResize)
  return () => window.removeEventListener('resize', onResize)
}, [])
```

---

## Keyboard Navigation
- `ArrowRight` / `ArrowLeft`: navigate between days in zoom mode
- `Escape`: close zoom / day detail (also saves reminder)

---

## Auto-save Logic (DayDetail.tsx)
Uses `prevDayRef`, `textRef`, `onSaveRef` refs + `useEffect([day])` to save reminder text automatically when navigating to a different day or closing.

---

## Animation Design

### Grid zoom
```ts
transition={{ type: 'tween', duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
```
Cubic ease-in-out, no bounce/spring.

### DayDetail fade-in/out
- Uses `AnimatePresence mode="wait"` + `key={day.dayIndex}` to remount on day change.
- **Enter**: opacity 0 → 1, delay `ZOOM_DURATION` (0.55s), duration 0.5s.
- **Exit**: opacity instantly to 0 (`duration: 0`).
- This means: DayDetail disappears instantly when closing or navigating, and fades in only after zoom settles.

### Pixel opacity
- Non-selected pixels animate to `opacity: 0.15` when any day is selected (`isDimmed` prop).
- Selected pixel stays at full opacity throughout — provides visual continuity as DayDetail fades in on top.

### Hover scale
- `whileHover` is always provided (never `undefined`) with `scale: isSelected || isDimmed ? 1 : 1.3`.
- This ensures Framer Motion actively resets scale to 1 when a pixel becomes selected or dimmed, preventing a stuck-scale bug.

---

## DayDetail Color Theming (DayDetail.module.css)
DayDetail background matches the selected pixel color. Text, border, and button colors adapt per state:
- `.past`: gray background, dark text, dark save button
- `.today`: red background, white text, white save button
- `.future`: dark background, white text, white save button

---

## Font Design (pixelFont.ts)
Bitmaps are 11×17 (DIGIT_WIDTH=11, DIGIT_HEIGHT=17), LCD/7-segment style with 2px thick strokes.
The four digits of "2026" have exactly 86+96+86+97 = 365 filled cells, so `findBestHeight` picks h=17 with diff=0 and no scaling is needed.

---

## DayDetail Overlay Placement (App.tsx / App.module.css)
The overlay is `position: absolute; inset: 0` inside `<main>`, **not** `position: fixed`. This ensures it shares the same coordinate space as the grid, so the DayDetail is centered at exactly the same point as the zoomed pixel.
