import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './BottomBar.module.css'

export type ViewMode = 'year' | 'months' | 'weeks' | 'custom'

const FIXED_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'year',   label: 'Visual Year' },
  { value: 'months', label: 'Months' },
  { value: 'weeks',  label: 'Weeks' },
  { value: 'custom', label: 'New Custom' },
]

interface Props {
  height: number
  fontSize: number
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  customLayouts: { id: string; name: string }[]
  activeCustomId: string | null
  onCustomLayoutSelect: (id: string) => void
  themes: { id: string; name: string }[]
  activeThemeId: string
  onThemeChange: (id: string) => void
  fonts: { id: string; name: string; family: string }[]
  activeFontId: string
  onFontChange: (id: string) => void
}

export function BottomBar({
  height, fontSize, viewMode, onViewModeChange, customLayouts, activeCustomId, onCustomLayoutSelect,
  themes, activeThemeId, onThemeChange,
  fonts, activeFontId, onFontChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isThemeOpen, setIsThemeOpen] = useState(false)
  const [isFontOpen, setIsFontOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const themeDropdownRef = useRef<HTMLDivElement>(null)
  const fontDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setIsThemeOpen(false)
      }
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
        setIsFontOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Determine the label shown in the view mode trigger
  const activeLayout = customLayouts.find(l => l.id === activeCustomId)
  const triggerLabel = activeLayout
    ? activeLayout.name
    : (FIXED_OPTIONS.find(o => o.value === viewMode)?.label ?? 'Visual Year')

  const activeThemeName = themes.find(t => t.id === activeThemeId)?.name ?? activeThemeId
  const activeFontName  = fonts.find(f => f.id === activeFontId)?.name ?? activeFontId

  return (
    <footer className={styles.bar} style={{ height, fontSize }}>
      <div className={styles.left}>
        <span className={styles.label}>Sort Pixels By :</span>
        <div className={styles.dropdown} ref={dropdownRef}>
          {/* zero-height sizer — wide enough for longest possible option */}
          <div className={styles.sizer} aria-hidden="true">Visual Year</div>
          <button className={styles.trigger} onClick={() => setIsOpen(o => !o)}>
            {triggerLabel}
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
                {FIXED_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`${styles.option} ${opt.value === viewMode && !activeCustomId ? styles.active : ''}`}
                    onClick={() => { onViewModeChange(opt.value); setIsOpen(false) }}
                  >
                    {opt.label}
                  </button>
                ))}
                {customLayouts.length > 0 && (
                  <div className={styles.divider} />
                )}
                {customLayouts.map(layout => (
                  <button
                    key={layout.id}
                    className={`${styles.option} ${layout.id === activeCustomId ? styles.active : ''}`}
                    onClick={() => { onCustomLayoutSelect(layout.id); setIsOpen(false) }}
                  >
                    {layout.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <span className={`${styles.label} ${styles.labelGap}`}>Theme :</span>
        <div className={styles.dropdown} ref={themeDropdownRef}>
          <div className={styles.sizer} aria-hidden="true">Retro</div>
          <button className={styles.trigger} onClick={() => setIsThemeOpen(o => !o)}>
            {activeThemeName}
            <span className={`${styles.arrow} ${isThemeOpen ? styles.arrowOpen : ''}`}>▼</span>
          </button>
          <AnimatePresence>
            {isThemeOpen && (
              <motion.div
                className={styles.menu}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0 }}
                transition={{ type: 'tween', duration: 0.15, ease: [0.65, 0, 0.35, 1] }}
                style={{ transformOrigin: 'bottom' }}
              >
                {themes.map(theme => (
                  <button
                    key={theme.id}
                    className={`${styles.option} ${theme.id === activeThemeId ? styles.active : ''}`}
                    onClick={() => { onThemeChange(theme.id); setIsThemeOpen(false) }}
                  >
                    {theme.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <span className={`${styles.label} ${styles.labelGap}`}>Font :</span>
        <div className={styles.dropdown} ref={fontDropdownRef}>
          <div className={styles.sizer} aria-hidden="true">Pixelify Sans</div>
          <button className={styles.trigger} onClick={() => setIsFontOpen(o => !o)}>
            {activeFontName}
            <span className={`${styles.arrow} ${isFontOpen ? styles.arrowOpen : ''}`}>▼</span>
          </button>
          <AnimatePresence>
            {isFontOpen && (
              <motion.div
                className={styles.menu}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0 }}
                transition={{ type: 'tween', duration: 0.15, ease: [0.65, 0, 0.35, 1] }}
                style={{ transformOrigin: 'bottom' }}
              >
                {fonts.map(font => (
                  <button
                    key={font.id}
                    className={`${styles.option} ${font.id === activeFontId ? styles.active : ''}`}
                    style={{ fontFamily: font.family }}
                    onClick={() => { onFontChange(font.id); setIsFontOpen(false) }}
                  >
                    {font.name}
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
