import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { useYear } from './hooks/useYear'
import { YearView, type GridLayout, type MonthLabelPos, type WeekLabelPos } from './components/YearView/YearView'
import { DayDetail } from './components/DayDetail/DayDetail'
import { TopBar } from './components/TopBar/TopBar'
import { BottomBar, type ViewMode } from './components/BottomBar/BottomBar'
import { SavePopup } from './components/SavePopup/SavePopup'
import { NoiseOverlay } from './components/NoiseOverlay/NoiseOverlay'
import { THEMES, applyTheme, DEFAULT_THEME_ID } from './data/themes'
import { FONTS, applyFont, DEFAULT_FONT_ID } from './data/fonts'
import { auth } from './lib/firebase'
import { signInWithGoogle, signOut } from './lib/auth'
import {
  loadRemindersFromFirestore, saveReminderToFirestore, migrateToFirestore,
  loadRemindersFromLocalStorage, saveReminderToLocalStorage, clearLocalStorageReminders,
  loadCustomLayoutsFromFirestore, saveCustomLayoutsToFirestore,
  loadCustomLayoutsFromLocalStorage, saveCustomLayoutsToLocalStorage, clearLocalStorageCustomLayouts,
} from './lib/db'
import type { DayInfo } from './hooks/useYear'
import styles from './App.module.css'

const CURRENT_YEAR = new Date().getFullYear()
const DETAIL_SIZE = 400   // px — DayDetail is a square; zoom is derived from this
const MIN_SIDE_COLS = 4   // empty columns guaranteed on each side of the year
const GRID_SCALE = 0.8    // reduce grid size to 80% of max to avoid oversized squares

// ── Weeks view layout constants ───────────────────────────────────────
const WK_LABEL_COLS = 6   // cols reserved for "Week NN" label per panel
const WK_DAY_COLS   = 8   // 5 weekday + 1 gap + 2 weekend per row
const WK_NUM_PANELS = 3   // panels (groups of weeks) side-by-side
const WK_PANEL_GAP  = 2   // empty cols between adjacent panels
const WK_PANEL_W    = WK_LABEL_COLS + WK_DAY_COLS          // 14 cols per panel
const WK_CONTENT_W  = WK_NUM_PANELS * WK_PANEL_W + (WK_NUM_PANELS - 1) * WK_PANEL_GAP  // 46

interface CustomLayout {
  id: string
  name: string
  positions: { col: number; row: number }[]
}

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
  const [user, setUser] = useState<User | null>(null)
  const [reminders, setReminders] = useState<Record<number, string>>(
    () => loadRemindersFromLocalStorage(CURRENT_YEAR)
  )
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('year')
  const [scatterPositions, setScatterPositions] = useState<{ x: number; y: number }[] | null>(null)
  const [fadeTransition, setFadeTransition] = useState<FadeTransition>(null)
  const [moveDuration, setMoveDuration] = useState(0)  // 0 = instant (resize); elevated only during transitions
  const scatterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transitionGenRef = useRef(0)
  const lastTransitionRef = useRef(-1)  // -1 = none yet

  // ── Custom view state ─────────────────────────────────────────────────
  const [customLayouts, setCustomLayouts] = useState<CustomLayout[]>(loadCustomLayoutsFromLocalStorage)
  const [activeCustomId, setActiveCustomId] = useState<string | null>(null)
  const [isEditingCustom, setIsEditingCustom] = useState(false)
  const [editPositions, setEditPositions] = useState<{ col: number; row: number }[] | null>(null)
  const [draggingDayIndex, setDraggingDayIndex] = useState<number | null>(null)
  const [showSavePopup, setShowSavePopup] = useState(false)

  // ── Theme state ───────────────────────────────────────────────────────
  const [activeThemeId, setActiveThemeId] = useState<string>(
    () => localStorage.getItem('1p1d-theme') ?? DEFAULT_THEME_ID
  )
  useEffect(() => {
    const theme = THEMES.find(t => t.id === activeThemeId) ?? THEMES[0]
    applyTheme(theme)
    localStorage.setItem('1p1d-theme', activeThemeId)
  }, [activeThemeId])

  // ── Font state ────────────────────────────────────────────────────────
  const [activeFontId, setActiveFontId] = useState<string>(
    () => localStorage.getItem('1p1d-font') ?? DEFAULT_FONT_ID
  )
  useEffect(() => {
    const font = FONTS.find(f => f.id === activeFontId) ?? FONTS[0]
    applyFont(font)
    localStorage.setItem('1p1d-font', activeFontId)
  }, [activeFontId])

  // ── Auth + data sync ──────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        // ── Reminders ──
        const cloudReminders = await loadRemindersFromFirestore(u.uid, CURRENT_YEAR)
        const localReminders = loadRemindersFromLocalStorage(CURRENT_YEAR)
        if (Object.keys(cloudReminders).length === 0 && Object.keys(localReminders).length > 0) {
          await migrateToFirestore(u.uid, CURRENT_YEAR, localReminders)
          setReminders(localReminders)
        } else {
          setReminders({ ...localReminders, ...cloudReminders })
        }
        clearLocalStorageReminders(CURRENT_YEAR)

        // ── Custom layouts ──
        const cloudLayouts = await loadCustomLayoutsFromFirestore(u.uid)
        const localLayouts = loadCustomLayoutsFromLocalStorage()
        if (cloudLayouts.length === 0 && localLayouts.length > 0) {
          await saveCustomLayoutsToFirestore(u.uid, localLayouts)
          setCustomLayouts(localLayouts)
        } else if (cloudLayouts.length > 0) {
          // Merge: cloud layouts + any local layouts not already in cloud
          const cloudIds = new Set(cloudLayouts.map(l => l.id))
          const merged = [...cloudLayouts, ...localLayouts.filter(l => !cloudIds.has(l.id))]
          setCustomLayouts(merged)
        }
        clearLocalStorageCustomLayouts()
      } else {
        // Signed out — fall back to localStorage
        setReminders(loadRemindersFromLocalStorage(CURRENT_YEAR))
        setCustomLayouts(loadCustomLayoutsFromLocalStorage())
      }
    })
  }, [])

  function persistLayouts(layouts: CustomLayout[]) {
    if (user) {
      saveCustomLayoutsToFirestore(user.uid, layouts)
    } else {
      saveCustomLayoutsToLocalStorage(layouts)
    }
  }

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

  // Mon-based offset of Jan 1 (Mon=0 … Sun=6) — used for correct week numbering
  const janFirstMon = days.length > 0 ? (days[0].date.getDay() + 6) % 7 : 0

  const selectedDay: DayInfo | null =
    selectedDayIndex !== null ? days[selectedDayIndex] : null

  // ── Grid layout computation ──────────────────────────────────────────
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

  const viewH = viewport.h - TOP_BAR_H * 2
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

  const ZOOM = DETAIL_SIZE / pixelSize

  const gridOffsetX = (viewW - gridW) / 2
  const gridOffsetY = (viewH - gridH) / 2

  // ── View mode stagger ─────────────────────────────────────────────────
  const MONTH_LABEL_COLS = 8
  const prevViewModeRef = useRef<ViewMode>(viewMode)
  const staggerDelay = prevViewModeRef.current !== viewMode && scatterPositions === null && fadeTransition === null
    ? 1.0 / (layout.totalDays - 1)
    : 0
  useEffect(() => { prevViewModeRef.current = viewMode }, [viewMode])

  // ── Edit mode enter stagger — only on the first render after isEditingCustom turns true ──
  const prevIsEditingRef = useRef(isEditingCustom)
  const editEnterStagger = !prevIsEditingRef.current && isEditingCustom
    ? 0.8 / Math.max(1, layout.totalDays - 1)
    : 0
  useEffect(() => { prevIsEditingRef.current = isEditingCustom }, [isEditingCustom])

  // ── Pixel positions per view mode ─────────────────────────────────────
  const pixelPositions = useMemo(() => {
    const { yearOffsetCol, yearOffsetRow, cellSize, bgCols, bgRows } = gridLayout

    // Pre-compute weeks layout values
    const numWeeks  = Math.ceil((days.length + janFirstMon) / 7)
    const wkRows    = Math.ceil(numWeeks / WK_NUM_PANELS)
    const wkStartC  = Math.max(0, Math.floor((bgCols - WK_CONTENT_W) / 2))
    const wkStartR  = Math.floor((bgRows - wkRows) / 2)
    const wkStride  = WK_PANEL_W + WK_PANEL_GAP

    // Custom positions source (edit takes priority over saved)
    const customSrc = editPositions
      ?? customLayouts.find(l => l.id === activeCustomId)?.positions
      ?? null

    return days.map(day => {
      if (viewMode === 'months') {
        const startCol = Math.floor((bgCols - (MONTH_LABEL_COLS + 31)) / 2)
        const startRow = Math.floor((bgRows - 23) / 2)
        return {
          x: (startCol + MONTH_LABEL_COLS + day.date.getDate() - 1) * cellSize,
          y: (startRow + day.date.getMonth() * 2) * cellSize,
        }
      }
      if (viewMode === 'weeks') {
        const wk      = Math.floor((day.dayIndex + janFirstMon) / 7)
        const pCol    = Math.floor(wk / wkRows)
        const pRow    = wk % wkRows
        const dow     = day.date.getDay()
        const localC  = dow === 0 ? 7 : dow === 6 ? 6 : dow - 1
        return {
          x: (wkStartC + pCol * wkStride + WK_LABEL_COLS + localC) * cellSize,
          y: (wkStartR + pRow) * cellSize,
        }
      }
      if (viewMode === 'custom' && customSrc) {
        const pos = customSrc[day.dayIndex]
        return { x: pos.col * cellSize, y: pos.row * cellSize }
      }
      // year / custom fallback: year layout positions
      const cell = layout.cells[day.dayIndex]
      return {
        x: (yearOffsetCol + cell.col) * cellSize,
        y: (yearOffsetRow + cell.row) * cellSize,
      }
    })
  }, [viewMode, days, layout, gridLayout, janFirstMon, editPositions, customLayouts, activeCustomId])

  // ── Month label positions ─────────────────────────────────────────────
  const monthLabelPositions = useMemo<MonthLabelPos[]>(() => {
    const { cellSize, bgCols, bgRows, pixelSize } = gridLayout
    const startCol = Math.floor((bgCols - (MONTH_LABEL_COLS + 31)) / 2)
    const startRow = Math.floor((bgRows - 23) / 2)
    return Array.from({ length: 12 }, (_, month) => ({
      month,
      x: (startCol + MONTH_LABEL_COLS - 1) * cellSize,
      y: (startRow + month * 2) * cellSize + pixelSize / 2,
    }))
  }, [gridLayout])

  // ── Week label positions ──────────────────────────────────────────────
  const weekLabelPositions = useMemo<WeekLabelPos[]>(() => {
    const { cellSize, bgCols, bgRows, pixelSize } = gridLayout
    const numWeeks = Math.ceil((layout.totalDays + janFirstMon) / 7)
    const wkRows   = Math.ceil(numWeeks / WK_NUM_PANELS)
    const startC   = Math.max(0, Math.floor((bgCols - WK_CONTENT_W) / 2))
    const startR   = Math.floor((bgRows - wkRows) / 2)
    const stride   = WK_PANEL_W + WK_PANEL_GAP
    return Array.from({ length: numWeeks }, (_, w) => ({
      week: w,
      x: (startC + Math.floor(w / wkRows) * stride + WK_LABEL_COLS - 1) * cellSize,
      y: (startR + (w % wkRows)) * cellSize + pixelSize / 2,
    }))
  }, [gridLayout, layout.totalDays, janFirstMon])

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
  const todayIdx   = days.find(d => d.state === 'today')?.dayIndex ?? -1
  const todayWeek  = todayIdx >= 0 ? Math.floor((todayIdx + janFirstMon) / 7) : -1

  // During fade-out keep old positions; during fade-in (or scatter/direct) use new positions
  const displayPositions = scatterPositions
    ?? (fadeTransition?.phase === 'out' ? fadeTransition.oldPositions : null)
    ?? pixelPositions

  // ── Camera zoom ───────────────────────────────────────────────────────
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

  // ── Drag-and-drop for custom edit mode ───────────────────────────────
  useEffect(() => {
    if (draggingDayIndex === null) return
    function onMove(e: PointerEvent) {
      // grid top-left in viewport coords: gridOffsetX, TOP_BAR_H + gridOffsetY
      const relX = e.clientX - gridOffsetX
      const relY = e.clientY - (TOP_BAR_H + gridOffsetY)
      const col = Math.max(0, Math.min(bgCols - 1, Math.round((relX - pixelSize / 2) / cellSize)))
      const row = Math.max(0, Math.min(bgRows - 1, Math.round((relY - pixelSize / 2) / cellSize)))
      setEditPositions(prev => {
        if (!prev) return prev
        const next = [...prev]
        next[draggingDayIndex] = { col, row }
        return next
      })
    }
    function onUp() { setDraggingDayIndex(null) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [draggingDayIndex, gridOffsetX, gridOffsetY, cellSize, bgCols, bgRows, pixelSize, TOP_BAR_H])

  // ── View mode transition — randomly picks from 3 transition types ──
  function runTransition(newMode: ViewMode, afterSetup?: () => void) {
    if (scatterTimerRef.current !== null) {
      clearTimeout(scatterTimerRef.current)
      scatterTimerRef.current = null
    }
    const gen = ++transitionGenRef.current

    const choices = [0, 1, 2].filter(t => t !== lastTransitionRef.current)
    const type = choices[Math.floor(Math.random() * choices.length)]
    lastTransitionRef.current = type

    if (type === 1) {
      const pos = Array.from({ length: layout.totalDays }, () => ({
        x: Math.floor(Math.random() * bgCols) * cellSize,
        y: Math.floor(Math.random() * bgRows) * cellSize,
      }))
      setScatterPositions(pos)
      setFadeTransition(null)
      setMoveDuration(0.5)
      scatterTimerRef.current = setTimeout(() => {
        if (transitionGenRef.current !== gen) return
        setScatterPositions(null)
        scatterTimerRef.current = setTimeout(() => {
          if (transitionGenRef.current !== gen) return
          setMoveDuration(0)
          scatterTimerRef.current = null
        }, 600)
      }, 700)
    } else if (type === 2) {
      const N = layout.totalDays
      const capturedPos = pixelPositions.map(p => ({ x: p.x, y: p.y }))
      setFadeTransition({ phase: 'out', rankOut: randomRanks(N), rankIn: randomRanks(N), oldPositions: capturedPos })
      setScatterPositions(null)
      setMoveDuration(0)
      const PHASE_MS = 900
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
      setScatterPositions(null)
      setFadeTransition(null)
      setMoveDuration(0.5)
      scatterTimerRef.current = setTimeout(() => {
        if (transitionGenRef.current !== gen) return
        setMoveDuration(0)
        scatterTimerRef.current = null
      }, 1600)
    }

    setViewMode(newMode)
    afterSetup?.()
  }

  function handleViewModeChange(newMode: ViewMode) {
    if (newMode === 'custom') {
      // No scatter/fade/direct transition — pixels stay put, only scale/shadow animates
      if (scatterTimerRef.current !== null) {
        clearTimeout(scatterTimerRef.current)
        scatterTimerRef.current = null
      }
      ++transitionGenRef.current
      setScatterPositions(null)
      setFadeTransition(null)
      setMoveDuration(0)
      const converted = pixelPositions.map(pos => ({
        col: Math.round(pos.x / cellSize),
        row: Math.round(pos.y / cellSize),
      }))
      setEditPositions(converted)
      setActiveCustomId(null)
      setIsEditingCustom(true)
      setViewMode('custom')
    } else {
      setIsEditingCustom(false)
      setEditPositions(null)
      setActiveCustomId(null)
      runTransition(newMode)
    }
  }

  function handleCustomLayoutSelect(id: string) {
    setIsEditingCustom(false)
    setEditPositions(null)
    setActiveCustomId(id)
    runTransition('custom')
  }

  function handleEditCustom() {
    const layout = customLayouts.find(l => l.id === activeCustomId)
    if (!layout) return
    setEditPositions([...layout.positions])
    setIsEditingCustom(true)
  }

  function handleDeleteCustom() {
    setCustomLayouts(prev => {
      const next = prev.filter(l => l.id !== activeCustomId)
      persistLayouts(next)
      return next
    })
    setActiveCustomId(null)
    setIsEditingCustom(false)
    setEditPositions(null)
    runTransition('year')
  }

  function handlePopupSave(name: string) {
    if (!editPositions) return
    if (activeCustomId) {
      // Update existing layout
      setCustomLayouts(prev => {
        const next = prev.map(l =>
          l.id === activeCustomId ? { ...l, name, positions: editPositions } : l
        )
        persistLayouts(next)
        return next
      })
    } else {
      // Create new layout
      const id = crypto.randomUUID()
      setCustomLayouts(prev => {
        const next = [...prev, { id, name, positions: editPositions }]
        persistLayouts(next)
        return next
      })
      setActiveCustomId(id)
    }
    setIsEditingCustom(false)
    setEditPositions(null)
    setShowSavePopup(false)
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
    setReminders(prev => {
      const next = { ...prev, [dayIndex]: reminder }
      if (user) {
        saveReminderToFirestore(user.uid, CURRENT_YEAR, dayIndex, reminder)
      } else {
        saveReminderToLocalStorage(CURRENT_YEAR, next)
      }
      return next
    })
  }

  // The active custom layout name (for save popup pre-fill when editing)
  const activeLayoutName = customLayouts.find(l => l.id === activeCustomId)?.name ?? ''

  return (
    <div className={styles.app}>
      <NoiseOverlay opacity={0.2} />
      <TopBar
        today={new Date()} daysLeft={daysLeft}
        height={TOP_BAR_H} fontSize={topBarFontSize} accentSize={topBarAccentSize}
        user={user} onSignIn={signInWithGoogle} onSignOut={signOut}
      />

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
            weekLabelPositions={weekLabelPositions}
            staggerDelay={staggerDelay}
            moveDuration={moveDuration}
            pixelOverrides={pixelOverrides}
            todayMonth={todayMonth}
            todayWeek={todayWeek}
            isEditMode={isEditingCustom}
            editEnterStagger={editEnterStagger}
            draggingDayIndex={draggingDayIndex}
            onPixelDragStart={setDraggingDayIndex}
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

        {/* Floating custom view controls — bottom-left of main */}
        <AnimatePresence>
          {viewMode === 'custom' && (
            <motion.div
              key={isEditingCustom ? 'save-ctrl' : 'edit-ctrl'}
              className={styles.customControls}
              style={{ fontSize: topBarFontSize }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              {isEditingCustom ? (
                <button className={styles.ctrlBtn} onClick={e => { e.stopPropagation(); setShowSavePopup(true) }}>
                  Save
                </button>
              ) : activeCustomId !== null ? (
                <>
                  <button className={styles.ctrlBtn} onClick={e => { e.stopPropagation(); handleEditCustom() }}>
                    Edit
                  </button>
                  <button className={`${styles.ctrlBtn} ${styles.ctrlBtnDanger}`} onClick={e => { e.stopPropagation(); handleDeleteCustom() }}>
                    Delete
                  </button>
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomBar
        height={TOP_BAR_H}
        fontSize={topBarFontSize}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        customLayouts={customLayouts}
        activeCustomId={activeCustomId}
        onCustomLayoutSelect={handleCustomLayoutSelect}
        themes={THEMES}
        activeThemeId={activeThemeId}
        onThemeChange={setActiveThemeId}
        fonts={FONTS}
        activeFontId={activeFontId}
        onFontChange={setActiveFontId}
      />

      <SavePopup
        isOpen={showSavePopup}
        initialName={activeLayoutName}
        onSave={handlePopupSave}
        onCancel={() => setShowSavePopup(false)}
      />
    </div>
  )
}
