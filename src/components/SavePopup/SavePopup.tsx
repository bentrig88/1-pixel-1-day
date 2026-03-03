import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './SavePopup.module.css'

interface Props {
  isOpen: boolean
  initialName?: string
  onSave: (name: string) => void
  onCancel: () => void
}

export function SavePopup({ isOpen, initialName = '', onSave, onCancel }: Props) {
  const [name, setName] = useState(initialName)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset name and focus input when popup opens
  useEffect(() => {
    if (isOpen) {
      setName(initialName)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [isOpen, initialName])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && name.trim()) onSave(name.trim())
    if (e.key === 'Escape') onCancel()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onPointerDown={e => { if (e.target === e.currentTarget) onCancel() }}
        >
          <motion.div
            className={styles.card}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'tween', duration: 0.2, ease: [0.65, 0, 0.35, 1] }}
          >
            <h2 className={styles.title}>Name your layout</h2>
            <input
              ref={inputRef}
              className={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. My custom view"
              maxLength={40}
            />
            <div className={styles.footer}>
              <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
              <button
                className={styles.saveBtn}
                onClick={() => name.trim() && onSave(name.trim())}
                disabled={!name.trim()}
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
