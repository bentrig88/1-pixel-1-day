import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import type { DayInfo } from '../../hooks/useYear'
import styles from './Pixel.module.css'

interface Props {
  day: DayInfo
  size: number
  x: number
  y: number
  delay: number
  scaleDelay: number       // stagger delay for scale/filter (used when entering edit mode)
  moveDuration: number
  opacityOverride: { target: number; delay: number; duration: number } | null
  onClick: (dayIndex: number) => void
  isSelected?: boolean
  isDimmed?: boolean
  isEditMode?: boolean
  isDragging?: boolean
  onDragStart?: (dayIndex: number) => void
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']

export function Pixel({ day, size, x, y, delay, scaleDelay, moveDuration, opacityOverride, onClick, isSelected, isDimmed, isEditMode, isDragging, onDragStart }: Props) {
  const isBlinking = day.state === 'today' && !isSelected && !isDimmed && !isEditMode
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  const dateLabel = `${WEEKDAYS[day.date.getDay()]} ${day.date.getDate()} ${MONTHS[day.date.getMonth()]} ${day.date.getFullYear()}`

  const editScale  = isDragging ? 1.5 : isEditMode ? 1.3 : 1
  const editFilter = isDragging
    ? 'drop-shadow(0px 10px 28px rgba(0,0,0,0.22))'
    : isEditMode
      ? 'drop-shadow(0px 4px 14px rgba(0,0,0,0.45))'
      : 'drop-shadow(0px 0px 0px rgba(0,0,0,0))'

  return (
    <>
      <motion.div
        className={[
          styles.pixel,
          styles[day.state],
          day.hasReminder ? styles.hasReminder : '',
          isDimmed ? styles.dimmed : '',
          isSelected ? styles.selected : '',
          isEditMode ? styles.editMode : '',
          isDragging ? styles.dragging : '',
        ].join(' ')}
        style={{ position: 'absolute', left: 0, top: 0, width: size, height: size }}
        initial={{ x, y }}
        animate={{
          x,
          y,
          opacity: opacityOverride
            ? opacityOverride.target
            : isDimmed ? 0.15 : isBlinking ? [1, 1, 0.25, 1, 1] : 1,
          scale: editScale,
          filter: editFilter,
        }}
        onClick={e => {
          e.stopPropagation()
          if (!isEditMode) onClick(day.dayIndex)
        }}
        onPointerDown={e => {
          if (!isEditMode || !onDragStart) return
          e.stopPropagation()
          e.currentTarget.setPointerCapture(e.pointerId)
          onDragStart(day.dayIndex)
        }}
        onMouseEnter={e => { if (!isEditMode) setTooltipPos({ x: e.clientX, y: e.clientY }) }}
        onMouseMove={e => { if (!isEditMode) setTooltipPos({ x: e.clientX, y: e.clientY }) }}
        onMouseLeave={() => setTooltipPos(null)}
        whileHover={isEditMode ? undefined : {
          scale: isSelected || isDimmed ? 1 : 1.3,
          transition: { type: 'spring', stiffness: 400, damping: 25 },
        }}
        transition={{
          x: { type: 'tween', duration: moveDuration, ease: [0.65, 0, 0.35, 1], delay },
          y: { type: 'tween', duration: moveDuration, ease: [0.65, 0, 0.35, 1], delay },
          scale: { type: 'tween', duration: isDragging ? 0.1 : 0.35, ease: [0.65, 0, 0.35, 1], delay: scaleDelay },
          filter: { type: 'tween', duration: isDragging ? 0.1 : 0.35, ease: [0.65, 0, 0.35, 1], delay: scaleDelay },
          opacity: opacityOverride
            ? { type: 'tween', duration: opacityOverride.duration, delay: opacityOverride.delay }
            : isBlinking
              ? { duration: 4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] }
              : { type: 'tween', duration: 0.5, ease: [0.65, 0, 0.35, 1] },
        }}
      />
      {tooltipPos && !isSelected && !isEditMode && createPortal(
        <div
          className={styles.tooltip}
          style={{ left: tooltipPos.x, top: tooltipPos.y - 24 }}
        >
          {dateLabel}
          <span className={styles.tooltipArrow} />
        </div>,
        document.body
      )}
    </>
  )
}
