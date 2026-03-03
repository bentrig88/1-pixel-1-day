import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DayInfo } from '../../hooks/useYear'
import styles from './DayDetail.module.css'

interface Props {
  day: DayInfo | null
  onClose: () => void
  onSave: (dayIndex: number, reminder: string) => void
  width?: number
  height?: number
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const ZOOM_DURATION = 0.55  // zoom is 0.7s; start fading in 150ms early

const BG = {
  past:   'var(--color-pixel-past)',
  today:  'var(--color-pixel-today)',
  future: 'var(--color-pixel-future)',
}

export function DayDetail({ day, onClose, onSave, width, height }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevDayRef = useRef<DayInfo | null>(null)
  const textRef = useRef(text)
  textRef.current = text
  const onSaveRef = useRef(onSave)
  useEffect(() => { onSaveRef.current = onSave })

  // Auto-save when navigating to a different day or closing
  useEffect(() => {
    const prevDay = prevDayRef.current
    if (prevDay && (day === null || day.dayIndex !== prevDay.dayIndex)) {
      onSaveRef.current(prevDay.dayIndex, textRef.current)
    }
    prevDayRef.current = day
  }, [day])

  useEffect(() => {
    if (day) {
      setText(day.reminder)
      setTimeout(() => textareaRef.current?.focus(), (ZOOM_DURATION + 0.3) * 1000)
    }
  }, [day])

  function handleSave() {
    if (day) onSave(day.dayIndex, text)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      handleSave()
      onClose()
    }
  }

  return (
    <AnimatePresence mode="wait">
      {day && (
        <motion.div
          key={day.dayIndex}
          className={`${styles.panel} ${styles[day.state]}`}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: {
              type: 'tween',
              duration: 0.5,
              ease: [0.65, 0, 0.35, 1],
              delay: ZOOM_DURATION,
            },
          }}
          exit={{
            opacity: 0,
            transition: { duration: 0 },
          }}
          style={{ width: width ?? 400, height: height ?? undefined, background: BG[day.state] }}
          onKeyDown={handleKeyDown}
          onClick={e => e.stopPropagation()}
        >
          <div className={styles.dateHeader}>
            <span className={styles.weekday}>
              {DAYS[day.date.getDay()]}
            </span>
            <span className={styles.dayNum}>
              {day.date.getDate()}
            </span>
            <span className={styles.month}>
              {MONTHS[day.date.getMonth()]}
            </span>
          </div>

          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Something to remember about this day..."
            maxLength={280}
          />

          <div className={styles.footer}>
            <span className={styles.charCount}>{text.length}/280</span>
            <button
              className={styles.saveBtn}
              onClick={() => { handleSave(); onClose() }}
            >
              SAVE
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
