
# 1 Pixel 1 Day — CLAUDE.md

## Project Overview
A React + TypeScript + Vite + Framer Motion app where each pixel = one day of the year.
- **Past days**: gray
- **Today**: red (accent color)
- **Future days**: dark

The year "2026" is rendered as pixel art where each filled square = one day, totalling exactly 365 squares.

---

## Tech Stack
- React + TypeScript + Vite
- Framer Motion (animations, zoom, transitions)
- Firebase Auth (Google Sign-In) + Firestore (reminder + layout persistence)
- WebGL (animated noise overlay)
- CSS Modules
- No external UI libraries

---

## File Structure
```
src/
  data/
    pixelFont.ts       — digit bitmaps (0-9), DIGIT_WIDTH=11, DIGIT_HEIGHT=17
    yearLayout.ts      — buildYearLayout(), findBestHeight(), scaleBitmap()
    themes.ts          — THEMES[], DEFAULT_THEME_ID, applyTheme()
    fonts.ts           — FONTS[], DEFAULT_FONT_ID, applyFont()
  hooks/
    useYear.ts         — returns { layout, days, todayDayIndex, daysLeft }
  lib/
    firebase.ts        — Firebase app init (paste config here), exports auth/db/provider
    auth.ts            — signInWithGoogle(), signOut()
    db.ts              — Firestore + localStorage helpers for reminders and custom layouts
  components/
    YearView/
      YearView.tsx     — renders bgRows × bgCols CSS grid + month/week labels + pixels
      YearView.module.css
    Pixel/
      Pixel.tsx        — single day square; supports isSelected, isDimmed, isEditMode, isDragging
      Pixel.module.css
    DayDetail/
      DayDetail.tsx    — day detail panel (date, textarea, save); auto-saves on navigation
      DayDetail.module.css
    TopBar/
      TopBar.tsx       — today's date, days remaining, Google sign-in/out button + avatar
      TopBar.module.css
    BottomBar/
      BottomBar.tsx    — view mode dropdown, theme dropdown, font dropdown, branding
      BottomBar.module.css
    SavePopup/
      SavePopup.tsx    — modal for naming a custom layout before saving
      SavePopup.module.css
    NoiseOverlay/
      NoiseOverlay.tsx — animated WebGL grain overlay (24fps, soft-light blend)
    Fireworks/
      Fireworks.tsx    — canvas particle system; shown when zooming Dec 31
  App.tsx              — all state, zoom, transitions, drag-and-drop, auth sync
  App.module.css
  index.css            — CSS theme variables (:root defaults) + legacy --color-* aliases
```

---

## Theme System (src/data/themes.ts)

All colors are CSS custom properties set on `:root` via `applyTheme()`. **To add a new theme**, add an entry to `THEMES` in `themes.ts` — it automatically appears in the dropdown.

### Variable reference
```css
--theme-bg                  /* app background */
--theme-grid-cell           /* background grid cells */
--theme-pixel-past          /* past day pixels */
--theme-pixel-today         /* today's pixel + accent color */
--theme-pixel-future        /* future day pixels */
--theme-pixel-past-hover    /* edit-mode hover on past pixels */
--theme-pixel-today-hover   /* edit-mode hover on today pixel */
--theme-pixel-future-hover  /* edit-mode hover on future pixels */
--theme-bar-bg              /* top/bottom bar background */
--theme-bar-text            /* bar primary text */
--theme-bar-muted           /* bar secondary/muted text */
--theme-surface             /* dropdowns, label backgrounds */
--theme-surface-hover       /* hover state on surface items */
--theme-surface-text        /* text on surface */
--theme-panel-bg            /* dark overlay panels (SavePopup, edit buttons) */
--theme-panel-text          /* text on panels */
--theme-label-idle          /* month/week labels (non-current period) */
--theme-divider             /* separator lines */
```

Legacy aliases (`--color-*`) in `index.css` point to `--theme-*` so older CSS still works.

Theme + font selections are persisted to localStorage (`1p1d-theme`, `1p1d-font`).

---

## Font System (src/data/fonts.ts)

Fonts control `--font-mono` CSS variable. **To add a new font**:
1. Add a `<link>` in `index.html` (Google Fonts or self-hosted)
2. Add an entry to `FONTS` in `fonts.ts`

Each font option in the dropdown renders in its own typeface via inline `fontFamily` style.

Current fonts: Pixelify Sans, Bytesized, Jersey 10, Jacquard 24 (all Google Fonts).

---

## Firebase Auth + Firestore (src/lib/)

### Auth flow
- **Guest** (signed out): reminders + custom layouts saved to localStorage
- **Sign in**: data migrates from localStorage to Firestore if cloud is empty; otherwise cloud wins on conflict; localStorage cleared after sync
- **Sign out**: falls back to localStorage

### Firestore structure
```
/users/{uid}/years/{year}         →  { reminders: { "42": "text", … } }
/users/{uid}/app/customLayouts    →  { layouts: CustomLayout[] }
```

### Persistence helpers (src/lib/db.ts)
- `loadRemindersFromFirestore` / `saveReminderToFirestore` / `migrateToFirestore`
- `loadCustomLayoutsFromFirestore` / `saveCustomLayoutsToFirestore`
- `loadRemindersFromLocalStorage` / `saveReminderToLocalStorage` / `clearLocalStorageReminders`
- `loadCustomLayoutsFromLocalStorage` / `saveCustomLayoutsToLocalStorage` / `clearLocalStorageCustomLayouts`

localStorage keys: `1p1d-reminders-{year}`, `1p1d-custom-layouts`

### Firestore security rules
```
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### Environment variables
Firebase config is stored in `.env.local` (never committed — covered by `*.local` in `.gitignore`):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```
Firebase API keys are **public by design** — security is enforced by Firestore Rules. The key in use must be the one Firebase auto-generated for the project (visible in Firebase Console → Project Settings → General → Web API Key). A manually created GCP key will cause `auth/configuration-not-found`.

### Firebase Console setup checklist
- Authentication → Sign-in method → Google: **enabled**
- Authentication → Settings → Authorized domains: add `localhost` + production domain
- GCP Console → Credentials → the Firebase web key: add HTTP referrer restrictions (`localhost/*`, `pixel-1-day.firebaseapp.com/*`, production domain)

---

## View Modes (BottomBar + App.tsx)

Four modes in the bottom bar dropdown:

| Mode | Layout |
|---|---|
| `year` | Default pixel-art year layout |
| `months` | 12 rows, one per month, days as columns |
| `weeks` | 3-panel column-major layout, one row per week |
| `custom` | User-defined drag-and-drop layout; saved to Firestore/localStorage |

### Custom view mode
- Selecting "New Custom" from dropdown enters edit mode: pixels scale to 0.8×, show a diagonal hatch pattern, and become draggable
- Drag a pixel → it scales to 1.5×, drops a shadow, snaps to grid cells
- Click **Save** → `SavePopup` modal asks for a name → layout stored under `customLayouts`
- Saved layouts appear in the dropdown below a divider
- Selecting a saved layout shows **Edit** / **Delete** floating controls
- `editPositions` (col/row per dayIndex) takes priority over saved positions during editing

---

## Custom Layout State (App.tsx)

```ts
interface CustomLayout {
  id: string                              // crypto.randomUUID()
  name: string
  positions: { col: number; row: number }[]  // one per dayIndex, resolution-independent
}

const [customLayouts, setCustomLayouts]     // persisted via persistLayouts()
const [activeCustomId, setActiveCustomId]   // null = no saved layout active
const [isEditingCustom, setIsEditingCustom]
const [editPositions, setEditPositions]     // null = use saved positions
const [draggingDayIndex, setDraggingDayIndex]
const [showSavePopup, setShowSavePopup]
```

`persistLayouts(layouts)` saves to Firestore (signed in) or localStorage (guest).

---

## Noise Overlay (src/components/NoiseOverlay/NoiseOverlay.tsx)

WebGL fragment shader generates per-pixel hash noise, seeded by a frame counter. Runs at 24fps (film grain aesthetic). Essentially zero CPU cost after init — all GPU.

```tsx
<NoiseOverlay opacity={0.2} fps={12} />
```

Props: `opacity` (0–1), `fps` (default 24). Uses `mix-blend-mode: soft-light`.

---

## Fireworks (src/components/Fireworks/Fireworks.tsx)

Canvas particle system shown when the selected day is **December 31**. Spawns pixel-art bursts (4–8px square particles) every 700–1200ms at random screen positions. Particles use gray tones matching `--theme-pixel-past` with gravity + air friction physics.

Rendered inside `<AnimatePresence>` in `App.tsx`:
```tsx
{isDec31 && <Fireworks />}
```

`isDec31` is true when `selectedDay?.getMonth() === 11 && selectedDay?.getDate() === 31`.

---

## Key Algorithms

### `findBestHeight` (yearLayout.ts)
Iterates heights 7–60, scales all 4 digit bitmaps via nearest-neighbor, counts total filled cells, picks the height with minimum `|total - daysInYear|`.

### Camera Zoom (App.tsx)
```ts
const ZOOM = DETAIL_SIZE / pixelSize   // dynamic
zoomX = ZOOM * (viewW / 2 - pixelCenterX)
zoomY = ZOOM * (viewH / 2 - pixelCenterY)
```

### Pixel Size Formula
```ts
const pixelSize = Math.max(1, Math.floor(
  Math.min(
    viewW / ((layout.gridCols + MIN_SIDE_COLS * 2) * 1.15),
    viewH / (layout.gridRows * 1.15),
  ) * GRID_SCALE  // 0.8
))
```

---

## Layout Constants
```ts
const DETAIL_SIZE    = 400   // px — DayDetail square size; ZOOM derived from this
const MIN_SIDE_COLS  = 4     // empty cols on each side of the year
const GRID_SCALE     = 0.8   // grid rendered at 80% of max size
const WK_LABEL_COLS  = 6     // cols for "Week NN" label
const WK_DAY_COLS    = 8     // 5 weekday + 1 gap + 2 weekend
const WK_NUM_PANELS  = 3
const WK_PANEL_GAP   = 2
// TOP_BAR_H is dynamic = 2 × rawCellSize
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

## Transition System (App.tsx)

Three types picked randomly on view mode change (never same type twice in a row):
- **Type 0 — Direct stagger**: pixels animate sequentially to new positions
- **Type 1 — Scatter**: pixels fly to random positions, then to final positions
- **Type 2 — Fade**: pixels fade out in random order, snap, fade in at new positions

Custom view mode bypasses transitions — pixels stay in place, only scale/shadow animates on edit mode enter.

---

## Keyboard Navigation
- `ArrowRight` / `ArrowLeft`: navigate between days in zoom mode
- `Escape`: close zoom / day detail (also saves reminder)

---

## Auto-save Logic (DayDetail.tsx)
Uses `prevDayRef`, `textRef`, `onSaveRef` refs + `useEffect([day])` to save automatically when navigating to a different day or closing.

---

## Deployment (IONOS shared hosting)

- Build: `npm run build` → uploads the **contents** of `dist/` (not the folder itself)
- Server: IONOS shared hosting (Apache, but `.htaccess` AllowOverride may be restricted)
- Hosting approach: subdomain `1p1d.benjamintrigalou.com` pointing to the upload folder
  - With subdomain as document root: no `base` needed in `vite.config.ts`
  - With subfolder (e.g. `/1p1d/`): set `base: '/1p1d/'` in `vite.config.ts`
- Since the app has **no client-side routes**, `.htaccess` rewrites are not needed for functionality — only for making the bare directory URL work without `/index.html`
- After deploying, add the production domain to Firebase Auth → Authorized domains

---

## Pending Improvements

*(No open items — all previously listed improvements are complete.)*
