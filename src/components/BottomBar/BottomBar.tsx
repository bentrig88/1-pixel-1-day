import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './BottomBar.module.css'

export type ViewMode = 'year' | 'months' | 'weeks' | 'custom'

const OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'year',   label: 'Visual Year' },
  { value: 'months', label: 'Months' },
  { value: 'weeks',  label: 'Weeks' },
  { value: 'custom', label: 'Custom' },
]

interface Props {
  height: number
  fontSize: number
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function BottomBar({ height, fontSize, viewMode, onViewModeChange }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = OPTIONS.find(o => o.value === viewMode)!

  return (
    <footer className={styles.bar} style={{ height, fontSize }}>
      <div className={styles.left}>
        <span className={styles.label}>Sort Pixels By :</span>
        <div className={styles.dropdown} ref={dropdownRef}>
          {/* zero-height sizer so the container is always as wide as the widest option */}
          <div className={styles.sizer} aria-hidden="true">Visual Year</div>
          <button className={styles.trigger} onClick={() => setIsOpen(o => !o)}>
            {selected.label}
            <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}>▼</span>
          </button>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className={styles.menu}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0 }}
                transition={{ type: 'tween', duration: 0.15, ease: [0.65, 0, 0.35, 1] }}
                style={{ transformOrigin: 'bottom' }}
              >
                {OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`${styles.option} ${opt.value === viewMode ? styles.active : ''}`}
                    onClick={() => { onViewModeChange(opt.value); setIsOpen(false) }}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className={styles.right}>
        <span className={styles.branding}>
          <span className={styles.brandWhite}>1</span>
          <span className={styles.brandRed}>PIXEL</span>
          <span className={styles.brandWhite}> = 1</span>
          <span className={styles.brandRed}>DAY</span>
        </span>
      </div>
    </footer>
  )
}
