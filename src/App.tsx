import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useYear } from './hooks/useYear'
import { YearView, type GridLayout, type MonthLabelPos } from './components/YearView/YearView'
import { DayDetail } from './components/DayDetail/DayDetail'
import { TopBar } from './components/TopBar/TopBar'
import { BottomBar, type ViewMode } from './components/BottomBar/BottomBar'
import type { DayInfo } from './hooks/useYear'
import styles from './App.module.css'

const CURRENT_YEAR = new Date().getFullYear()
const DETAIL_SIZE = 400   // px — DayDetail is a square; zoom is derived from this
const MIN_SIDE_COLS = 4   // empty columns guaranteed on each side of the year
const GRID_SCALE = 0.8    // reduce grid size to 80% of max to avoid oversized squares

type FadeTransition = {
  phase: 'out' | 'in'
  rankOut: number[]  // rankOut[i] = position of pixel i in the fade-out order
  rankIn: number[]   // rankIn[i]  = position of pixel i in the fade-in order
  oldPositions: { x: number; y: number }[]
} | null

function randomRanks(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function App() {
  const [reminders, setReminders] = useState<Record<number, string>>({})
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('year')
  const [scatterPositions, setScatterPositions] = useState<{ x: number; y: number }[] | null>(null)
  const [fadeTransition, setFadeTransition] = useState<FadeTransition>(null)
  const scatterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transitionGenRef = useRef(0)

  // ── Responsive viewport — re-renders on resize ───────────────────────
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    function onResize() {
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const viewW = viewport.w

  const { layout, days, daysLeft } = useYear(CURRENT_YEAR, reminders)

  const selectedDay: DayInfo | null =
    selectedDayIndex !== null ? days[selectedDayIndex] : null

  // ── Grid layout computation ──────────────────────────────────────────
  // Top bar height = 2 × cellSize (dynamic). To avoid circularity, first
  // compute a raw pixelSize using full viewport height, derive cellSize and
  // thus topBarH, then recompute pixelSize with the actual remaining height.
  const rawPixelSize = Math.max(1, Math.floor(
    Math.min(
      viewW / ((layout.gridCols + MIN_SIDE_COLS * 2) * 1.15),
      viewport.h / (layout.gridRows * 1.15),
    )
  ))
  const rawCellSize = rawPixelSize + Math.max(1, Math.floor(rawPixelSize * 0.15))
  const TOP_BAR_H = 2 * rawCellSize
  const topBarFontSize = Math.round(rawCellSize * 0.65)
  const topBarAccentSize = Math.round(rawCellSize * 0.80)

  const viewH = viewport.h - TOP_BAR_H * 2  // subtract both top and bottom bar
  const pixelSize = Math.max(1, Math.floor(
    Math.min(
      viewW / ((layout.gridCols + MIN_SIDE_COLS * 2) * 1.15),
      viewH / (layout.gridRows * 1.15),
    ) * GRID_SCALE
  ))
  const gap = Math.max(1, Math.floor(pixelSize * 0.15))
  const cellSize = pixelSize + gap

  const bgCols = Math.max(layout.gridCols, Math.floor(viewW / cellSize))
  const bgRows = Math.max(layout.gridRows, Math.floor(viewH / cellSize))
  const yearOffsetCol = Math.floor((bgCols - layout.gridCols) / 2)
  const yearOffsetRow = Math.floor((bgRows - layout.gridRows) / 2)
  const gridW = bgCols * cellSize - gap
  const gridH = bgRows * cellSize - gap

  const gridLayout: GridLayout = {
    pixelSize, gap, cellSize,
    bgCols, bgRows,
    yearOffsetCol, yearOffsetRow,
    gridW, gridH,
  }

  // ── Camera zoom — zoom is derived so that pixelSize * ZOOM === DETAIL_SIZE ──
  // This makes every zoomed square the exact same size as the DayDetail card.
  const ZOOM = DETAIL_SIZE / pixelSize

  const gridOffsetX = (viewW - gridW) / 2
  const gridOffsetY = (viewH - gridH) / 2

  // ── View mode stagger — only active on the render where mode changes ──
  const MONTH_LABEL_COLS = 8  // cell-widths reserved for month name labels
  const prevViewModeRef = useRef<ViewMode>(viewMode)
  // Stagger only for direct transition — suppressed during scatter and fade
  const staggerDelay = prevViewModeRef.current !== viewMode && scatterPositions === null && fadeTransition === null
    ? 1.0 / (layout.totalDays - 1)
    : 0
  useEffect(() => { prevViewModeRef.current = viewMode }, [viewMode])

  // ── Pixel positions per view mode ─────────────────────────────────────
  const pixelPositions = useMemo(() => {
    const { yearOffsetCol, yearOffsetRow, cellSize, bgCols, bgRows } = gridLayout
    return days.map(day => {
      if (viewMode === 'months') {
        // Snap to grid: 12 month rows, each separated by 1 gap row (23 rows total)
        const startCol = Math.floor((bgCols - (MONTH_LABEL_COLS + 31)) / 2)
        const startRow = Math.floor((bgRows - 23) / 2)
        return {
          x: (startCol + MONTH_LABEL_COLS + day.date.getDate() - 1) * cellSize,
          y: (startRow + day.date.getMonth() * 2) * cellSize,
        }
      }
      // year / weeks / custom: use year layout positions
      const cell = layout.cells[day.dayIndex]
      return {
        x: (yearOffsetCol + cell.col) * cellSize,
        y: (yearOffsetRow + cell.row) * cellSize,
      }
    })
  }, [viewMode, days, layout, gridLayout])

  // ── Month label positions ─────────────────────────────────────────────
  const monthLabelPositions = useMemo<MonthLabelPos[]>(() => {
    const { cellSize, bgCols, bgRows, pixelSize } = gridLayout
    const startCol = Math.floor((bgCols - (MONTH_LABEL_COLS + 31)) / 2)
    const startRow = Math.floor((bgRows - 23) / 2)
    return Array.from({ length: 12 }, (_, month) => ({
      month,
      x: (startCol + MONTH_LABEL_COLS - 1) * cellSize,   // right edge of white box, 1 square gap to pixels
      y: (startRow + month * 2) * cellSize + pixelSize / 2,  // vertically centered on pixel row
    }))
  }, [gridLayout])

  // ── Per-pixel opacity override for fade transition ───────────────────
  const pixelOverrides = useMemo(() => {
    if (!fadeTransition) return null
    const stagger = 0.5 / (days.length - 1)
    return days.map(day => {
      const rank = fadeTransition.phase === 'out'
        ? fadeTransition.rankOut[day.dayIndex]
        : fadeTransition.rankIn[day.dayIndex]
      return { target: fadeTransition.phase === 'out' ? 0 : 1, delay: rank * stagger, duration: 0.4 }
    })
  }, [fadeTransition, days])

  const todayMonth = new Date().getMonth()

  // ── Scatter transition ────────────────────────────────────────────────
  // During fade-out keep old positions; during fade-in (or scatter/direct) use new positions
  const displayPositions = scatterPositions
    ?? (fadeTransition?.phase === 'out' ? fadeTransition.oldPositions : null)
    ?? pixelPositions
  // Scatter phase 1: fast 0.4s; fade transition: instant (0) so jump is invisible; direct: 0.5s
  const moveDuration = scatterPositions !== null ? 0.4 : fadeTransition !== null ? 0 : 0.5

  // ── Camera zoom — uses pixelPositions so it works correctly in all view modes ──
  let zoomX = 0, zoomY = 0, zoomScale = 1
  if (selectedDayIndex !== null) {
    const pos = pixelPositions[selectedDayIndex]
    const pixelCenterX = gridOffsetX + pos.x + pixelSize / 2
    const pixelCenterY = gridOffsetY + pos.y + pixelSize / 2
    zoomX = ZOOM * (viewW / 2 - pixelCenterX)
    zoomY = ZOOM * (viewH / 2 - pixelCenterY)
    zoomScale = ZOOM
  }

  // ── Arrow key navigation ─────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedDayIndex === null) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedDayIndex(i => Math.min(layout.totalDays - 1, (i ?? 0) + 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectedDayIndex(i => Math.max(0, (i ?? 0) - 1))
      } else if (e.key === 'Escape') {
        setSelectedDayIndex(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedDayIndex, layout.totalDays])

  // ── View mode transition — randomly picks from 3 transition types ──
  function handleViewModeChange(newMode: ViewMode) {
    if (scatterTimerRef.current !== null) {
      clearTimeout(scatterTimerRef.current)
      scatterTimerRef.current = null
    }
    const gen = ++transitionGenRef.current

    const type = Math.floor(Math.random() * 3)  // 0 = direct, 1 = scatter, 2 = fade

    if (type === 1) {
      // Scatter: fly to random grid cells, pause 300ms, land on final positions
      const pos = Array.from({ length: layout.totalDays }, () => ({
        x: Math.floor(Math.random() * bgCols) * cellSize,
        y: Math.floor(Math.random() * bgRows) * cellSize,
      }))
      setScatterPositions(pos)
      setFadeTransition(null)
      scatterTimerRef.current = setTimeout(() => {
        if (transitionGenRef.current !== gen) return
        setScatterPositions(null)
        scatterTimerRef.current = null
      }, 700)
    } else if (type === 2) {
      // Fade: fade out in random order → instant position jump → fade in in random order
      const N = layout.totalDays
      const capturedPos = pixelPositions.map(p => ({ x: p.x, y: p.y }))
      setFadeTransition({ phase: 'out', rankOut: randomRanks(N), rankIn: randomRanks(N), oldPositions: capturedPos })
      setScatterPositions(null)
      const PHASE_MS = 900  // 0.5s stagger + 0.4s fade = 0.9s per phase
      scatterTimerRef.current = setTimeout(() => {
        if (transitionGenRef.current !== gen) return
        setFadeTransition(prev => prev && { ...prev, phase: 'in' })
        scatterTimerRef.current = setTimeout(() => {
          if (transitionGenRef.current !== gen) return
          setFadeTransition(null)
          scatterTimerRef.current = null
        }, PHASE_MS)
      }, PHASE_MS)
    } else {
      // Direct: stagger pixels sequentially to final positions
      setScatterPositions(null)
      setFadeTransition(null)
    }

    setViewMode(newMode)
  }

  function handleDayClick(dayIndex: number) {
    setSelectedDayIndex(dayIndex)
  }

  function handleMainClick() {
    if (selectedDayIndex !== null) setSelectedDayIndex(null)
  }

  function handleClose() {
    setSelectedDayIndex(null)
  }

  function handleSave(dayIndex: number, reminder: string) {
    setReminders(prev => ({ ...prev, [dayIndex]: reminder }))
  }

  return (
    <div className={styles.app}>
      <TopBar today={new Date()} daysLeft={daysLeft} height={TOP_BAR_H} fontSize={topBarFontSize} accentSize={topBarAccentSize} />

      <main
        className={`${styles.main} ${selectedDayIndex !== null ? styles.zoomed : ''}`}
        onClick={handleMainClick}
      >
        <motion.div
          className={styles.gridWrapper}
          animate={{ x: zoomX, y: zoomY, scale: zoomScale }}
          transition={{ type: 'tween', duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
        >
          <YearView
            layout={layout}
            gridLayout={gridLayout}
            days={days}
            onDayClick={handleDayClick}
            selectedDayIndex={selectedDayIndex}
            viewMode={viewMode}
            pixelPositions={displayPositions}
            monthLabelPositions={monthLabelPositions}
            staggerDelay={staggerDelay}
            moveDuration={moveDuration}
            pixelOverrides={pixelOverrides}
            todayMonth={todayMonth}
          />
        </motion.div>

        {/* Overlay lives inside main so it shares the same coordinate space as the grid */}
        <div className={styles.detailOverlay}>
          <DayDetail
            day={selectedDay}
            onClose={handleClose}
            onSave={handleSave}
            width={DETAIL_SIZE}
            height={DETAIL_SIZE}
          />
        </div>
      </main>
      <BottomBar
        height={TOP_BAR_H}
        fontSize={topBarFontSize}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
    </div>
  )
}
