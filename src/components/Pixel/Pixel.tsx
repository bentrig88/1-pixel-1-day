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
  moveDuration: number
  onClick: (dayIndex: number) => void
  isSelected?: boolean
  isDimmed?: boolean
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']

export function Pixel({ day, size, x, y, delay, moveDuration, onClick, isSelected, isDimmed }: Props) {
  const isBlinking = day.state === 'today' && !isSelected && !isDimmed
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  const dateLabel = `${WEEKDAYS[day.date.getDay()]} ${day.date.getDate()} ${MONTHS[day.date.getMonth()]} ${day.date.getFullYear()}`

  return (
    <>
      <motion.div
        className={[
          styles.pixel,
          styles[day.state],
          day.hasReminder ? styles.hasReminder : '',
          isDimmed ? styles.dimmed : '',
          isSelected ? styles.selected : '',
        ].join(' ')}
        style={{ position: 'absolute', left: 0, top: 0, width: size, height: size }}
        initial={{ x, y }}
        animate={{
          x,
          y,
          opacity: isDimmed ? 0.15 : isBlinking ? [1, 1, 0.25, 1, 1] : 1,
          scale: 1,
        }}
        onClick={e => { e.stopPropagation(); onClick(day.dayIndex) }}
        onMouseEnter={e => setTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseMove={e => setTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setTooltipPos(null)}
        whileHover={{
          scale: isSelected || isDimmed ? 1 : 1.3,
          transition: { type: 'spring', stiffness: 400, damping: 25 },
        }}
        transition={{
          x: { type: 'tween', duration: moveDuration, ease: [0.65, 0, 0.35, 1], delay },
          y: { type: 'tween', duration: moveDuration, ease: [0.65, 0, 0.35, 1], delay },
          opacity: isBlinking
            ? { duration: 4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] }
            : { type: 'tween', duration: 0.5, ease: [0.65, 0, 0.35, 1] },
        }}
      />
      {tooltipPos && !isSelected && createPortal(
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
