import { useMemo } from 'react'
import type { DayInfo } from '../../hooks/useYear'
import type { YearLayout } from '../../data/yearLayout'
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

interface Props {
  layout: YearLayout
  gridLayout: GridLayout
  days: DayInfo[]
  onDayClick: (dayIndex: number) => void
  selectedDayIndex: number | null
}

export function YearView({ layout, gridLayout, days, onDayClick, selectedDayIndex }: Props) {
  const { pixelSize, gap, bgCols, bgRows, yearOffsetCol, yearOffsetRow } = gridLayout

  // Map (bgRow, bgCol) → dayIndex for year cells
  const cellMap = useMemo(() => {
    const map: Record<number, Record<number, number>> = {}
    for (const cell of layout.cells) {
      const bgRow = yearOffsetRow + cell.row
      const bgCol = yearOffsetCol + cell.col
      if (!map[bgRow]) map[bgRow] = {}
      map[bgRow][bgCol] = cell.dayIndex
    }
    return map
  }, [layout, yearOffsetRow, yearOffsetCol])

  const hasSel = selectedDayIndex !== null

  return (
    <div
      className={styles.grid}
      style={{
        gridTemplateColumns: `repeat(${bgCols}, ${pixelSize}px)`,
        gridTemplateRows: `repeat(${bgRows}, ${pixelSize}px)`,
        gap: `${gap}px`,
      }}
    >
      {Array.from({ length: bgRows }, (_, row) =>
        Array.from({ length: bgCols }, (_, col) => {
          const dayIndex = cellMap[row]?.[col]
          if (dayIndex !== undefined) {
            return (
              <Pixel
                key={dayIndex}
                day={days[dayIndex]}
                size={pixelSize}
                onClick={onDayClick}
                isSelected={dayIndex === selectedDayIndex}
                isDimmed={hasSel && dayIndex !== selectedDayIndex}
              />
            )
          }
          return (
            <div
              key={`bg-${row}-${col}`}
              className={styles.bgCell}
              style={{ width: pixelSize, height: pixelSize }}
            />
          )
        })
      )}
    </div>
  )
}
