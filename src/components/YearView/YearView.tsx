import { motion, AnimatePresence } from 'framer-motion'
import type { DayInfo } from '../../hooks/useYear'
import type { YearLayout } from '../../data/yearLayout'
import type { ViewMode } from '../BottomBar/BottomBar'
import { Pixel } from '../Pixel/Pixel'
import styles from './YearView.module.css'

export interface GridLayout {
  pixelSize: number
  gap: number
  cellSize: number
  bgCols: number
  bgRows: number
  yearOffsetCol: number
  yearOffsetRow: number
  gridW: number
  gridH: number
}

export interface MonthLabelPos {
  month: number
  x: number
  y: number
}

interface Props {
  layout: YearLayout
  gridLayout: GridLayout
  days: DayInfo[]
  onDayClick: (dayIndex: number) => void
  selectedDayIndex: number | null
  viewMode: ViewMode
  pixelPositions: { x: number; y: number }[]
  monthLabelPositions: MonthLabelPos[]
  staggerDelay: number
  todayMonth: number
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December']

export function YearView({
  layout, gridLayout, days, onDayClick, selectedDayIndex,
  viewMode, pixelPositions, monthLabelPositions, staggerDelay, todayMonth,
}: Props) {
  const { pixelSize, gap, bgCols, bgRows, gridW, gridH } = gridLayout
  const hasSel = selectedDayIndex !== null

  return (
    <div style={{ position: 'relative', width: gridW, height: gridH }}>

      {/* Background grid — all bgCols × bgRows cells as plain divs */}
      <div
        className={styles.grid}
        style={{
          position: 'absolute',
          inset: 0,
          gridTemplateColumns: `repeat(${bgCols}, ${pixelSize}px)`,
          gridTemplateRows: `repeat(${bgRows}, ${pixelSize}px)`,
          gap: `${gap}px`,
        }}
      >
        {Array.from({ length: bgRows * bgCols }, (_, i) => (
          <div key={i} className={styles.bgCell} style={{ width: pixelSize, height: pixelSize }} />
        ))}
      </div>

      {/* Month labels — fade in when in months mode */}
      <AnimatePresence>
        {viewMode === 'months' && (
          <motion.div
            key="month-labels"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {monthLabelPositions.map(({ month, x, y }) => (
              <span
                key={month}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  transform: 'translate(-100%, -50%)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: Math.max(8, pixelSize * 0.8),
                  whiteSpace: 'nowrap',
                  color: month === todayMonth
                    ? 'var(--color-pixel-today)'
                    : '#888',
                }}
              >
                {MONTH_NAMES[month]}
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active day pixels — absolutely positioned, animate between modes */}
      {days.map(day => (
        <Pixel
          key={day.dayIndex}
          day={day}
          size={pixelSize}
          x={pixelPositions[day.dayIndex].x}
          y={pixelPositions[day.dayIndex].y}
          delay={day.dayIndex * staggerDelay}
          onClick={onDayClick}
          isSelected={day.dayIndex === selectedDayIndex}
          isDimmed={hasSel && day.dayIndex !== selectedDayIndex}
        />
      ))}
    </div>
  )
}
