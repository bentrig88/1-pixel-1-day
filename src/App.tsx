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

export default function App() {
  const [reminders, setReminders] = useState<Record<number, string>>({})
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('year')
  const [scatterPositions, setScatterPositions] = useState<{ x: number; y: number }[] | null>(null)
  const scatterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  // No stagger during scatter phase — pixels move simultaneously
  const staggerDelay = prevViewModeRef.current !== viewMode && scatterPositions === null
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

  const todayMonth = new Date().getMonth()

  // ── Scatter transition ────────────────────────────────────────────────
  const displayPositions = scatterPositions ?? pixelPositions
  // Phase 1 (scatter): 0.4s fast scatter; Phase 2 / direct: 0.5s normal move
  const moveDuration = scatterPositions !== null ? 0.4 : 0.5

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

  // ── View mode transition — randomly picks direct stagger or scatter ──
  function handleViewModeChange(newMode: ViewMode) {
    if (scatterTimerRef.current !== null) {
      clearTimeout(scatterTimerRef.current)
      scatterTimerRef.current = null
    }
    if (Math.random() < 0.5) {
      // Scatter transition: scatter to random grid cells, pause, then land on final positions
      const pos = Array.from({ length: layout.totalDays }, () => ({
        x: Math.floor(Math.random() * bgCols) * cellSize,
        y: Math.floor(Math.random() * bgRows) * cellSize,
      }))
      setScatterPositions(pos)
      scatterTimerRef.current = setTimeout(() => {
        setScatterPositions(null)
        scatterTimerRef.current = null
      }, 700)  // 400ms scatter animation + 300ms pause
    } else {
      setScatterPositions(null)  // direct stagger transition
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
