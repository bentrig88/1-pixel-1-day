import { motion } from 'framer-motion'
import type { DayInfo } from '../../hooks/useYear'
import styles from './Pixel.module.css'

interface Props {
  day: DayInfo
  size: number
  onClick: (dayIndex: number) => void
  isSelected?: boolean
  isDimmed?: boolean
}

export function Pixel({ day, size, onClick, isSelected, isDimmed }: Props) {
  return (
    <motion.div
      className={[
        styles.pixel,
        styles[day.state],
        day.hasReminder ? styles.hasReminder : '',
      ].join(' ')}
      style={{ width: size, height: size }}
      animate={{
        opacity: isDimmed ? 0.15 : 1,
        scale: 1,
      }}
      onClick={e => { e.stopPropagation(); onClick(day.dayIndex) }}
      whileHover={{
        scale: isSelected || isDimmed ? 1 : 1.3,
        transition: { type: 'spring', stiffness: 400, damping: 25 },
      }}
      transition={{ opacity: { type: 'tween', duration: 0.5, ease: [0.65, 0, 0.35, 1] } }}
      title={day.date.toLocaleDateString('en-US', {
        weekday: 'short', day: 'numeric', month: 'short'
      })}
    />
  )
}
